create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.individual_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  account_status text not null default 'active' check (account_status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.individual_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  product_code text not null,
  credits_quantity integer not null check (credits_quantity > 0),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired','refunded','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (workspace_id, idempotency_key),
  unique (id, workspace_id, owner_user_id)
);

create table public.individual_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  workspace_id uuid not null,
  owner_user_id uuid not null,
  provider text not null,
  provider_payment_ref text not null,
  provider_event_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  foreign key (order_id, workspace_id, owner_user_id)
    references public.individual_orders(id, workspace_id, owner_user_id) on delete restrict,
  unique (provider, provider_payment_ref)
);
create unique index individual_payments_provider_event_uidx
  on public.individual_payments(provider, provider_event_id) where provider_event_id is not null;

create table public.individual_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.individual_orders(id) on delete restrict,
  payment_id uuid not null unique references public.individual_payments(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  entitlement_type text not null default 'verification_credits',
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','exhausted','revoked')),
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('purchase_credit','verification_debit','refund_reversal','admin_adjustment','expiry')),
  delta integer not null check (delta <> 0),
  reference_type text not null,
  reference_id uuid not null,
  idempotency_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index individual_orders_workspace_created_idx on public.individual_orders(workspace_id, created_at desc);
create index individual_payments_order_idx on public.individual_payments(order_id);
create index individual_entitlements_workspace_status_idx on public.individual_entitlements(workspace_id, status);
create index credit_ledger_workspace_created_idx on public.credit_ledger(workspace_id, created_at desc);
create index credit_ledger_owner_created_idx on public.credit_ledger(owner_user_id, created_at desc);

create or replace function private.create_individual_account_for_workspace()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.workspace_type = 'individual' then
    insert into public.individual_accounts(workspace_id, owner_user_id)
    values (new.id, new.owner_user_id) on conflict (workspace_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_individual_account_for_workspace on public.workspaces;
create trigger trg_create_individual_account_for_workspace
after insert on public.workspaces for each row
execute function private.create_individual_account_for_workspace();

insert into public.individual_accounts(workspace_id, owner_user_id)
select id, owner_user_id from public.workspaces where workspace_type = 'individual'
on conflict (workspace_id) do nothing;

create or replace function private.reject_credit_ledger_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'CREDIT_LEDGER_APPEND_ONLY: update and delete are prohibited';
end;
$$;
drop trigger if exists trg_credit_ledger_immutable on public.credit_ledger;
create trigger trg_credit_ledger_immutable before update or delete on public.credit_ledger
for each row execute function private.reject_credit_ledger_mutation();

create or replace function private.confirm_individual_payment(
  p_payment_id uuid, p_provider_event_id text, p_verified_provider_payment_ref text,
  p_verified_amount_minor bigint, p_verified_currency text,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_payment public.individual_payments%rowtype;
  v_order public.individual_orders%rowtype;
  v_entitlement_id uuid;
begin
  if p_payment_id is null or nullif(trim(p_provider_event_id), '') is null
     or nullif(trim(p_verified_provider_payment_ref), '') is null
     or p_verified_amount_minor is null or nullif(trim(p_verified_currency), '') is null then
    raise exception 'PAYMENT_CONFIRMATION_INVALID_INPUT';
  end if;
  select * into v_payment from public.individual_payments where id=p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.individual_orders where id=v_payment.order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_payment.provider_payment_ref <> p_verified_provider_payment_ref
     or v_payment.amount_minor <> p_verified_amount_minor
     or upper(v_payment.currency) <> upper(p_verified_currency)
     or v_order.amount_minor <> p_verified_amount_minor
     or upper(v_order.currency) <> upper(p_verified_currency) then
    raise exception 'PAYMENT_AMOUNT_CURRENCY_OR_REFERENCE_MISMATCH';
  end if;
  if v_payment.status='succeeded' then
    if v_payment.provider_event_id=p_provider_event_id then
      select id into v_entitlement_id from public.individual_entitlements where payment_id=v_payment.id;
      return jsonb_build_object('status','already_confirmed','payment_id',v_payment.id,'order_id',v_order.id,'entitlement_id',v_entitlement_id);
    end if;
    raise exception 'PAYMENT_ALREADY_CONFIRMED_WITH_DIFFERENT_EVENT';
  end if;
  if v_payment.status<>'pending' or v_order.status<>'pending' then raise exception 'PAYMENT_OR_ORDER_NOT_PENDING'; end if;

  update public.individual_payments set status='succeeded',provider_event_id=p_provider_event_id,
    provider_payload=coalesce(p_provider_payload,'{}'::jsonb),confirmed_at=now(),updated_at=now()
  where id=v_payment.id;
  update public.individual_orders set status='paid',paid_at=now(),updated_at=now() where id=v_order.id;

  insert into public.individual_entitlements(order_id,payment_id,workspace_id,owner_user_id,quantity)
  values(v_order.id,v_payment.id,v_order.workspace_id,v_order.owner_user_id,v_order.credits_quantity)
  on conflict(order_id) do nothing returning id into v_entitlement_id;
  if v_entitlement_id is null then
    select id into v_entitlement_id from public.individual_entitlements where order_id=v_order.id;
  end if;

  insert into public.credit_ledger(workspace_id,owner_user_id,entry_type,delta,reference_type,reference_id,idempotency_key,description)
  values(v_order.workspace_id,v_order.owner_user_id,'purchase_credit',v_order.credits_quantity,
    'individual_payment',v_payment.id,'individual-payment:'||v_payment.id::text,'Credits granted after confirmed payment')
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('status','confirmed','payment_id',v_payment.id,'order_id',v_order.id,
    'entitlement_id',v_entitlement_id,'credits_granted',v_order.credits_quantity);
end;
$$;

revoke all on function private.create_individual_account_for_workspace() from public,anon,authenticated;
revoke all on function private.reject_credit_ledger_mutation() from public,anon,authenticated;
revoke all on function private.confirm_individual_payment(uuid,text,text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function private.confirm_individual_payment(uuid,text,text,bigint,text,jsonb) to service_role;

alter table public.individual_accounts enable row level security;
alter table public.individual_orders enable row level security;
alter table public.individual_payments enable row level security;
alter table public.individual_entitlements enable row level security;
alter table public.credit_ledger enable row level security;

create policy individual_accounts_select_member on public.individual_accounts for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
create policy individual_orders_select_member on public.individual_orders for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
create policy individual_payments_select_member on public.individual_payments for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
create policy individual_entitlements_select_member on public.individual_entitlements for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));
create policy credit_ledger_select_member on public.credit_ledger for select to authenticated
using (public.is_current_user_active_workspace_member(workspace_id));

revoke all on public.individual_accounts,public.individual_orders,public.individual_payments,public.individual_entitlements,public.credit_ledger from anon,authenticated;
grant select on public.individual_accounts,public.individual_orders,public.individual_payments,public.individual_entitlements,public.credit_ledger to authenticated;
grant all on public.individual_accounts,public.individual_orders,public.individual_payments,public.individual_entitlements,public.credit_ledger to service_role;
