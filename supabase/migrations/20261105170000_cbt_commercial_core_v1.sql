-- CBT-01: Commercial CBT foundation.
-- Additive only. Existing AI grading and plagiarism objects are untouched.

create table if not exists public.cbt_public_candidate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  student_id uuid not null unique references public.students(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cbt_public_offers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null unique references public.cbt_exams(id) on delete cascade,
  price_minor bigint not null check (price_minor >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  is_listed boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cbt_public_offer_window_valid check (
    available_until is null or available_from is null or available_until > available_from
  )
);

create table if not exists public.cbt_public_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  offer_id uuid not null references public.cbt_public_offers(id) on delete restrict,
  exam_id uuid not null references public.cbt_exams(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  provider text not null check (provider in ('paystack','free')),
  provider_reference text not null unique,
  provider_transaction_id text,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  provider_payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.cbt_public_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  exam_id uuid not null references public.cbt_exams(id) on delete restrict,
  order_id uuid not null unique references public.cbt_public_orders(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, exam_id)
);

create index if not exists cbt_public_offers_listed_idx
  on public.cbt_public_offers (is_listed, available_from, available_until);
create index if not exists cbt_public_orders_user_created_idx
  on public.cbt_public_orders (user_id, created_at desc);
create index if not exists cbt_public_entitlements_user_exam_idx
  on public.cbt_public_entitlements (user_id, exam_id, status);
create unique index if not exists cbt_public_orders_provider_txn_unique
  on public.cbt_public_orders (provider_transaction_id)
  where provider_transaction_id is not null;

alter table public.cbt_public_candidate_profiles enable row level security;
alter table public.cbt_public_offers enable row level security;
alter table public.cbt_public_orders enable row level security;
alter table public.cbt_public_entitlements enable row level security;

drop policy if exists cbt_public_candidate_read_own on public.cbt_public_candidate_profiles;
create policy cbt_public_candidate_read_own
  on public.cbt_public_candidate_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists cbt_public_offer_read_listed on public.cbt_public_offers;
create policy cbt_public_offer_read_listed
  on public.cbt_public_offers for select to anon, authenticated
  using (
    is_listed
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now())
  );

drop policy if exists cbt_public_order_read_own on public.cbt_public_orders;
create policy cbt_public_order_read_own
  on public.cbt_public_orders for select to authenticated
  using (user_id = auth.uid());

drop policy if exists cbt_public_entitlement_read_own on public.cbt_public_entitlements;
create policy cbt_public_entitlement_read_own
  on public.cbt_public_entitlements for select to authenticated
  using (user_id = auth.uid());

grant select on public.cbt_public_offers to anon, authenticated;
grant select on public.cbt_public_candidate_profiles,
  public.cbt_public_orders,
  public.cbt_public_entitlements to authenticated;

-- The same exam engine now accepts a candidate who has either class eligibility
-- or a server-granted public entitlement. The candidate identity still resolves
-- through the existing students row used by attempts, answers and results.
create or replace function public.cbt_student_can_access_exam(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    exists (
      select 1
      from public.cbt_exams e
      join public.students s on s.class_id = e.class_id
      where e.id = p_exam_id
        and s.user_id = auth.uid()
        and e.status in ('published','active')
        and (e.start_time is null or now() >= e.start_time)
        and (e.end_time is null or now() < e.end_time)
    )
    or exists (
      select 1
      from public.cbt_public_entitlements pe
      join public.cbt_public_candidate_profiles cp
        on cp.user_id = pe.user_id and cp.student_id = pe.student_id
      join public.cbt_exams e on e.id = pe.exam_id
      where pe.exam_id = p_exam_id
        and pe.user_id = auth.uid()
        and pe.status = 'active'
        and e.status in ('published','active')
        and (e.start_time is null or now() >= e.start_time)
        and (e.end_time is null or now() < e.end_time)
    );
$function$;

create or replace function public.get_cbt_authoring_catalog(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_classes jsonb;
  v_subjects jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.gradifi_school_memberships m
    join public.schools s on s.id=m.school_id
    where m.user_id=auth.uid() and m.school_id=p_school_id
      and m.status='active'
      and m.member_role in ('principal','school_admin','teacher','exam_officer')
      and s.provisioning_status='active'
  ) then raise exception 'ACCESS_DENIED: ACTIVE_SCHOOL_ROLE_REQUIRED'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.name),'[]'::jsonb)
  into v_classes from public.classes c where c.school_id=p_school_id;

  select coalesce(jsonb_agg(jsonb_build_object('id',sc.id,'name',sc.name) order by sc.name),'[]'::jsonb)
  into v_subjects from public.subject_catalog sc;

  return jsonb_build_object('classes',v_classes,'subjects',v_subjects);
end;
$function$;

create or replace function public.create_cbt_exam_v3(
  p_school_id uuid,
  p_class_id uuid,
  p_subject_id uuid,
  p_term_id uuid,
  p_title text,
  p_description text,
  p_duration_minutes integer,
  p_pass_mark integer,
  p_start_time timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_teacher_id uuid;
  v_exam_id uuid;
  v_class_school uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(length(btrim(p_title)),0)=0 then raise exception 'Exam title is required'; end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 then raise exception 'Exam duration must be positive'; end if;
  if p_pass_mark is null or p_pass_mark < 0 then raise exception 'Pass mark cannot be negative'; end if;
  if p_start_time is null then raise exception 'Exam start time is required'; end if;

  if not exists (
    select 1 from public.gradifi_school_memberships m
    join public.schools s on s.id=m.school_id
    where m.user_id=auth.uid()
      and m.school_id=p_school_id
      and m.status='active'
      and m.member_role in ('principal','school_admin','teacher','exam_officer')
      and s.provisioning_status='active'
  ) then
    raise exception 'ACCESS_DENIED: ACTIVE_SCHOOL_ROLE_REQUIRED';
  end if;

  select c.school_id into v_class_school
  from public.classes c where c.id=p_class_id;
  if not found or v_class_school <> p_school_id then
    raise exception 'Class does not belong to the requested school';
  end if;

  if not exists (select 1 from public.subject_catalog sc where sc.id=p_subject_id) then
    raise exception 'Subject does not exist';
  end if;

  select t.id into v_teacher_id
  from public.teachers t
  where t.user_id=auth.uid() and t.school_id=p_school_id
  order by t.id limit 1;

  insert into public.cbt_exams (
    school_id,class_id,subject_id,term_id,title,description,duration_minutes,
    total_marks,pass_mark,exam_date,start_time,end_time,created_by,status,current_state
  ) values (
    p_school_id,p_class_id,p_subject_id,p_term_id,btrim(p_title),p_description,
    p_duration_minutes,0,p_pass_mark,p_start_time::date,p_start_time,
    p_start_time + make_interval(mins=>p_duration_minutes),
    v_teacher_id,'draft','draft'
  ) returning id into v_exam_id;

  return jsonb_build_object(
    'success',true,'exam_id',v_exam_id,'title',btrim(p_title),
    'status','draft','start_time',p_start_time,
    'end_time',p_start_time + make_interval(mins=>p_duration_minutes)
  );
end;
$function$;

create or replace function public.update_cbt_question(
  p_question_id uuid,
  p_question_text text,
  p_marks integer,
  p_question_number integer,
  p_options jsonb,
  p_difficulty text default 'medium'
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_exam_id uuid;
  v_exam_status text;
  v_old_marks integer;
  v_option jsonb;
  v_option_count integer;
  v_correct_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(length(btrim(p_question_text)),0)=0 then raise exception 'Question text is required'; end if;
  if p_marks is null or p_marks<=0 then raise exception 'Question marks must be positive'; end if;
  if p_question_number is null or p_question_number<=0 then raise exception 'Question number must be positive'; end if;
  if p_difficulty not in ('easy','medium','hard') then raise exception 'Invalid question difficulty'; end if;
  if p_options is null or jsonb_typeof(p_options)<>'array' then raise exception 'Options must be a JSON array'; end if;

  select q.exam_id,q.marks,e.status into v_exam_id,v_old_marks,v_exam_status
  from public.cbt_questions q join public.cbt_exams e on e.id=q.exam_id
  where q.id=p_question_id for update of q,e;
  if not found then raise exception 'Question not found'; end if;
  perform public.assert_exam_access(v_exam_id);
  if v_exam_status<>'draft' then raise exception 'Published exam questions are immutable'; end if;

  select count(*),count(*) filter (where coalesce((item->>'is_correct')::boolean,false))
  into v_option_count,v_correct_count
  from jsonb_array_elements(p_options) item;
  if v_option_count<2 or v_correct_count<>1 then
    raise exception 'At least two options and exactly one correct option are required';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_options) item
    where coalesce(btrim(item->>'text'),'')=''
       or coalesce(btrim(item->>'letter'),'')=''
  ) then raise exception 'Every option requires non-empty text and letter'; end if;

  update public.cbt_questions
  set question_text=btrim(p_question_text),marks=p_marks,
      question_number=p_question_number,difficulty=p_difficulty
  where id=p_question_id;

  delete from public.cbt_options where question_id=p_question_id;
  for v_option in select value from jsonb_array_elements(p_options)
  loop
    insert into public.cbt_options(question_id,option_text,is_correct,option_letter)
    values(p_question_id,btrim(v_option->>'text'),
      (v_option->>'is_correct')::boolean,upper(btrim(v_option->>'letter')));
  end loop;

  update public.cbt_exams
  set total_marks=total_marks-v_old_marks+p_marks,updated_at=now()
  where id=v_exam_id;

  return jsonb_build_object('success',true,'question_id',p_question_id,'total_marks_delta',p_marks-v_old_marks);
end;
$function$;

create or replace function public.delete_cbt_question(p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_exam_id uuid;
  v_marks integer;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select q.exam_id,q.marks,e.status into v_exam_id,v_marks,v_status
  from public.cbt_questions q join public.cbt_exams e on e.id=q.exam_id
  where q.id=p_question_id for update of q,e;
  if not found then raise exception 'Question not found'; end if;
  perform public.assert_exam_access(v_exam_id);
  if v_status<>'draft' then raise exception 'Published exam questions are immutable'; end if;
  delete from public.cbt_options where question_id=p_question_id;
  delete from public.cbt_questions where id=p_question_id;
  update public.cbt_exams set total_marks=greatest(0,total_marks-v_marks),updated_at=now()
  where id=v_exam_id;
  return jsonb_build_object('success',true,'deleted_question_id',p_question_id);
end;
$function$;

create or replace function public.get_cbt_active_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_student_id from public.students
  where user_id=auth.uid()
  order by created_at nulls last,id limit 1;
  if v_student_id is null then
    return jsonb_build_object('active',false);
  end if;

  select jsonb_build_object(
    'active',true,'attempt_id',a.id,'attempt_number',a.attempt_number,
    'session_id',s.id,'start_time',a.start_time,'deadline_at',a.deadline_at,
    'status',a.status,'session_state',s.state,'current_question',s.current_question
  ) into v_result
  from public.cbt_attempts a
  join public.cbt_sessions s on s.attempt_id=a.id
  where a.exam_id=p_exam_id and a.student_id=v_student_id and a.status='in_progress'
  order by a.attempt_number desc,a.created_at desc
  limit 1;

  return coalesce(v_result,jsonb_build_object('active',false));
end;
$function$;

create or replace function public.get_cbt_attempt_state(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_state jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'success',true,'attempt_id',a.id,'exam_id',a.exam_id,
    'deadline_at',a.deadline_at,'status',a.status,
    'session_id',s.id,'session_state',s.state,
    'current_question',coalesce((select snap.current_question from public.cbt_session_snapshots snap where snap.session_id=s.id order by snap.created_at desc,snap.id desc limit 1),s.current_question),
    'remaining_time',coalesce((select snap.remaining_time from public.cbt_session_snapshots snap where snap.session_id=s.id order by snap.created_at desc,snap.id desc limit 1),s.remaining_time),
    'answers',coalesce((
      select jsonb_object_agg(ans.question_id::text,ans.selected_option_id::text)
      from public.cbt_answers ans where ans.attempt_id=a.id and ans.selected_option_id is not null
    ),'{}'::jsonb)
  ) into v_state
  from public.cbt_attempts a
  join public.students st on st.id=a.student_id
  join public.cbt_sessions s on s.attempt_id=a.id
  where a.id=p_attempt_id and st.user_id=auth.uid();

  if v_state is null then raise exception 'CBT_ATTEMPT_NOT_FOUND_OR_NOT_OWNED'; end if;
  return v_state;
end;
$function$;

create or replace function public.get_cbt_candidate_result(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select cp.student_id into v_student_id
  from public.cbt_public_candidate_profiles cp where cp.user_id=auth.uid();

  if v_student_id is null then
    select s.id into v_student_id from public.students s
    where s.user_id=auth.uid()
    order by s.created_at nulls last,s.id limit 1;
  end if;
  if v_student_id is null then raise exception 'Candidate identity not found'; end if;

  select jsonb_build_object(
    'exam',jsonb_build_object('id',e.id,'title',e.title,'subjectName',sc.name,
      'className',c.name,'totalMarks',e.total_marks,'passMark',e.pass_mark),
    'result',jsonb_build_object('id',r.id,'score',r.score,'maxScore',r.total_marks,
      'percentage',r.percentage,'grade',r.grade,'status',
      case when r.score>=coalesce(e.pass_mark,0) then 'Passed' else 'Failed' end,
      'submittedAt',a.submitted_at)
  ) into v_result
  from public.cbt_results_summary r
  join public.cbt_exams e on e.id=r.exam_id
  join public.subject_catalog sc on sc.id=e.subject_id
  join public.classes c on c.id=e.class_id
  left join public.cbt_attempts a on a.id=r.attempt_id
  where r.exam_id=p_exam_id and r.student_id=v_student_id
  order by r.created_at desc,r.id desc
  limit 1;

  if v_result is null then raise exception 'CBT_RESULT_NOT_FOUND_FOR_CANDIDATE'; end if;
  return v_result;
end;
$function$;

create or replace function public.cbt_public_register_candidate(
  p_first_name text default null,
  p_last_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_student_id uuid;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select u.email,u.email_confirmed_at into v_email,v_email_confirmed_at
  from auth.users u where u.id=v_user_id;
  if coalesce(v_email,'')='' or v_email_confirmed_at is null then
    raise exception 'A verified email address is required';
  end if;

  select s.id,s.first_name,s.last_name
  into v_student_id,v_first_name,v_last_name
  from public.students s
  where s.user_id=v_user_id
  order by s.created_at nulls last,s.id
  limit 1;

  if v_student_id is null then
    v_first_name:=nullif(btrim(p_first_name),'');
    v_last_name:=nullif(btrim(p_last_name),'');
    if v_first_name is null or v_last_name is null then
      raise exception 'First name and last name are required to register a public candidate';
    end if;

    insert into public.students(first_name,last_name,user_id,metadata,enrollment_status)
    values(v_first_name,v_last_name,v_user_id,
      jsonb_build_object('candidate_channel','public_cbt'),'active')
    returning id into v_student_id;
  else
    v_first_name:=coalesce(nullif(btrim(p_first_name),''),v_first_name);
    v_last_name:=coalesce(nullif(btrim(p_last_name),''),v_last_name);
  end if;

  insert into public.cbt_public_candidate_profiles(user_id,student_id,first_name,last_name,email)
  values(v_user_id,v_student_id,v_first_name,v_last_name,v_email)
  on conflict(user_id) do update
    set first_name=excluded.first_name,last_name=excluded.last_name,
        email=excluded.email,updated_at=now();

  return jsonb_build_object('success',true,'student_id',v_student_id,'email',v_email);
end;
$function$;

create or replace function public.cbt_public_get_offers()
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'offer_id',o.id,'exam_id',e.id,'title',e.title,
      'description',e.description,'duration_minutes',e.duration_minutes,
      'total_marks',e.total_marks,'exam_date',e.exam_date,
      'start_time',e.start_time,'end_time',e.end_time,
      'school_name',s.school_name,'subject_name',sc.name,'class_name',c.name,
      'price_minor',o.price_minor,'currency',o.currency
    ) order by o.created_at desc
  ),'[]'::jsonb)
  from public.cbt_public_offers o
  join public.cbt_exams e on e.id=o.exam_id
  join public.schools s on s.id=e.school_id
  join public.subject_catalog sc on sc.id=e.subject_id
  join public.classes c on c.id=e.class_id
  where o.is_listed=true and e.status='published'
    and (o.available_from is null or o.available_from<=now())
    and (o.available_until is null or o.available_until>now())
    and (e.end_time is null or e.end_time>now());
$function$;

create or replace function public.cbt_public_create_offer(
  p_exam_id uuid,
  p_price_minor bigint,
  p_currency text default 'NGN',
  p_is_listed boolean default true,
  p_available_from timestamptz default null,
  p_available_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_offer public.cbt_public_offers%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_price_minor is null or p_price_minor<0 then raise exception 'Price must be zero or greater'; end if;
  if coalesce(length(p_currency),0)<>3 then raise exception 'Currency must be a three-letter code'; end if;
  perform public.assert_exam_access(p_exam_id);
  if not exists(select 1 from public.cbt_exams e where e.id=p_exam_id and e.status='published') then
    raise exception 'Only published exams can be listed publicly';
  end if;

  insert into public.cbt_public_offers(
    exam_id,price_minor,currency,is_listed,available_from,available_until,created_by
  ) values (
    p_exam_id,p_price_minor,upper(p_currency),coalesce(p_is_listed,true),
    p_available_from,p_available_until,auth.uid()
  )
  on conflict(exam_id) do update
    set price_minor=excluded.price_minor,currency=excluded.currency,
        is_listed=excluded.is_listed,available_from=excluded.available_from,
        available_until=excluded.available_until,updated_at=now()
  returning * into v_offer;

  return jsonb_build_object('success',true,'offer_id',v_offer.id,'exam_id',v_offer.exam_id,
    'price_minor',v_offer.price_minor,'currency',v_offer.currency,'is_listed',v_offer.is_listed);
end;
$function$;

create or replace function public.cbt_public_create_order(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.cbt_public_candidate_profiles%rowtype;
  v_offer public.cbt_public_offers%rowtype;
  v_exam_status text;
  v_order public.cbt_public_orders%rowtype;
  v_reference text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_candidate from public.cbt_public_candidate_profiles where user_id=v_user_id;
  if not found then raise exception 'Public candidate registration is required'; end if;

  select o.* into v_offer
  from public.cbt_public_offers o join public.cbt_exams e on e.id=o.exam_id
  where o.id=p_offer_id and o.is_listed=true
    and e.status='published'
    and (o.available_from is null or o.available_from<=now())
    and (o.available_until is null or o.available_until>now())
    and (e.end_time is null or e.end_time>now())
  for update of o;
  if not found then raise exception 'Public exam offer is unavailable'; end if;

  if exists(select 1 from public.cbt_public_entitlements pe
    where pe.user_id=v_user_id and pe.exam_id=v_offer.exam_id and pe.status='active') then
    return jsonb_build_object('success',true,'already_entitled',true,'exam_id',v_offer.exam_id);
  end if;

  select * into v_order from public.cbt_public_orders
  where user_id=v_user_id and exam_id=v_offer.exam_id and status='pending'
  order by created_at desc limit 1 for update;
  if found then
    return jsonb_build_object('success',true,'order_id',v_order.id,'exam_id',v_order.exam_id,
      'amount_minor',v_order.amount_minor,'currency',v_order.currency,'provider',v_order.provider,
      'provider_reference',v_order.provider_reference,'status',v_order.status,'free',false);
  end if;

  v_reference:='CBT-'||upper(replace(gen_random_uuid()::text,'-',''));

  insert into public.cbt_public_orders(
    user_id,student_id,offer_id,exam_id,amount_minor,currency,provider,provider_reference,status,paid_at
  ) values (
    v_user_id,v_candidate.student_id,v_offer.id,v_offer.exam_id,v_offer.price_minor,
    v_offer.currency,case when v_offer.price_minor=0 then 'free' else 'paystack' end,
    v_reference,case when v_offer.price_minor=0 then 'paid' else 'pending' end,
    case when v_offer.price_minor=0 then now() else null end
  ) returning * into v_order;

  if v_offer.price_minor=0 then
    insert into public.cbt_public_entitlements(user_id,student_id,exam_id,order_id)
    values(v_user_id,v_candidate.student_id,v_offer.exam_id,v_order.id)
    on conflict(user_id,exam_id) do update
      set order_id=excluded.order_id,status='active',granted_at=now(),revoked_at=null;
  end if;

  return jsonb_build_object(
    'success',true,'order_id',v_order.id,'exam_id',v_order.exam_id,
    'amount_minor',v_order.amount_minor,'currency',v_order.currency,
    'provider',v_order.provider,'provider_reference',v_order.provider_reference,
    'status',v_order.status,'free',v_offer.price_minor=0
  );
end;
$function$;

create or replace function public.cbt_public_confirm_payment(
  p_reference text,
  p_transaction_id text,
  p_amount_minor bigint,
  p_currency text,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_order public.cbt_public_orders%rowtype;
begin
  select * into v_order
  from public.cbt_public_orders
  where provider_reference=p_reference
  for update;
  if not found then raise exception 'CBT_PUBLIC_ORDER_NOT_FOUND'; end if;

  if v_order.provider <> 'paystack' then raise exception 'CBT_PAYMENT_PROVIDER_MISMATCH'; end if;
  if v_order.status='paid' then
    if v_order.provider_transaction_id is not null
       and v_order.provider_transaction_id<>p_transaction_id then
      raise exception 'CBT_PAYMENT_REFERENCE_CONFLICT';
    end if;
    return jsonb_build_object('success',true,'already_confirmed',true,
      'order_id',v_order.id,'exam_id',v_order.exam_id);
  end if;
  if v_order.status<>'pending' then raise exception 'CBT_ORDER_NOT_PENDING'; end if;
  if p_transaction_id is null or p_transaction_id='' then raise exception 'CBT_TRANSACTION_ID_REQUIRED'; end if;
  if p_amount_minor is distinct from v_order.amount_minor then raise exception 'CBT_PAYMENT_AMOUNT_MISMATCH'; end if;
  if upper(coalesce(p_currency,'')) is distinct from v_order.currency then raise exception 'CBT_PAYMENT_CURRENCY_MISMATCH'; end if;

  update public.cbt_public_orders
  set status='paid',provider_transaction_id=p_transaction_id,
      provider_payload=coalesce(p_provider_payload,'{}'::jsonb),paid_at=now(),failure_reason=null
  where id=v_order.id;

  insert into public.cbt_public_entitlements(user_id,student_id,exam_id,order_id)
  values(v_order.user_id,v_order.student_id,v_order.exam_id,v_order.id)
  on conflict(user_id,exam_id) do update
    set order_id=excluded.order_id,status='active',granted_at=now(),revoked_at=null;

  return jsonb_build_object('success',true,'already_confirmed',false,
    'order_id',v_order.id,'exam_id',v_order.exam_id);
end;
$function$;

create or replace function public.cbt_public_mark_payment_failed(
  p_reference text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_order public.cbt_public_orders%rowtype;
begin
  update public.cbt_public_orders
  set status='failed',failure_reason=left(coalesce(p_reason,'Payment failed'),500)
  where provider_reference=p_reference and status='pending'
  returning * into v_order;
  return jsonb_build_object('success',true,'updated',found);
end;
$function$;

create or replace function public.get_cbt_exam_results(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_exam jsonb;
  v_results jsonb;
  v_summary jsonb;
begin
  perform public.assert_exam_access(p_exam_id);

  select jsonb_build_object(
    'id',e.id,'title',e.title,'subjectName',sc.name,'className',c.name,
    'durationMinutes',e.duration_minutes,'passMark',e.pass_mark,
    'examDate',e.exam_date,'totalMarks',e.total_marks,'status',e.status
  ) into v_exam
  from public.cbt_exams e
  join public.subject_catalog sc on sc.id=e.subject_id
  join public.classes c on c.id=e.class_id
  where e.id=p_exam_id;
  if v_exam is null then raise exception 'EXAM_NOT_FOUND'; end if;

  with ranked as (
    select rs.id,rs.student_id,rs.score,rs.total_marks,rs.percentage,rs.grade,
      coalesce(s.first_name,'') as first_name,coalesce(s.last_name,'') as last_name,
      coalesce(a.submitted_at,rs.created_at) as submitted_at,
      row_number() over(order by rs.score desc,coalesce(a.submitted_at,rs.created_at),rs.id) as rank
    from public.cbt_results_summary rs
    join public.students s on s.id=rs.student_id
    left join public.cbt_attempts a on a.id=rs.attempt_id
    where rs.exam_id=p_exam_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'studentName',btrim(first_name||' '||last_name),'studentId',student_id,
    'score',score,'maxScore',total_marks,'percentage',coalesce(percentage,0),
    'grade',coalesce(grade,'F'),'position',
      rank::text || case when rank%100 between 11 and 13 then 'th'
        else case rank%10 when 1 then 'st' when 2 then 'nd' when 3 then 'rd' else 'th' end end,
    'submittedAt',submitted_at,'status',case when score >= (v_exam->>'passMark')::integer then 'Passed' else 'Failed' end
  ) order by rank),'[]'::jsonb)
  into v_results
  from ranked;

  with rows as (
    select rs.score,rs.percentage,rs.grade
    from public.cbt_results_summary rs
    where rs.exam_id=p_exam_id
  ), distribution as (
    select coalesce(grade,'N/A') as grade,count(*) as total
    from rows group by coalesce(grade,'N/A')
  )
  select jsonb_build_object(
    'averageScore',coalesce(round(avg(percentage),1),0),
    'passRate',coalesce(round(count(*) filter(where score >= (v_exam->>'passMark')::integer)*100.0/nullif(count(*),0),1),0),
    'topScore',coalesce(max(percentage),0),
    'totalStudents',count(*),
    'gradeDistribution',coalesce((select jsonb_object_agg(grade,total) from distribution),'{}'::jsonb)
  ) into v_summary from rows;

  return jsonb_build_object('exam',v_exam,'results',v_results,'summary',v_summary);
end;
$function$;

revoke all on function public.get_cbt_authoring_catalog(uuid) from public, anon;
grant execute on function public.get_cbt_authoring_catalog(uuid) to authenticated;

revoke all on function public.create_cbt_exam_v3(uuid,uuid,uuid,uuid,text,text,integer,integer,timestamptz) from public, anon;
grant execute on function public.create_cbt_exam_v3(uuid,uuid,uuid,uuid,text,text,integer,integer,timestamptz) to authenticated;

revoke all on function public.update_cbt_question(uuid,text,integer,integer,jsonb,text) from public, anon;
grant execute on function public.update_cbt_question(uuid,text,integer,integer,jsonb,text) to authenticated;

revoke all on function public.delete_cbt_question(uuid) from public, anon;
grant execute on function public.delete_cbt_question(uuid) to authenticated;

revoke all on function public.get_cbt_candidate_result(uuid) from public, anon;
grant execute on function public.get_cbt_candidate_result(uuid) to authenticated;

revoke all on function public.get_cbt_attempt_state(uuid) from public, anon;
grant execute on function public.get_cbt_attempt_state(uuid) to authenticated;

revoke all on function public.get_cbt_active_attempt(uuid) from public, anon;
grant execute on function public.get_cbt_active_attempt(uuid) to authenticated;

revoke all on function public.cbt_public_register_candidate(text,text) from public, anon;
grant execute on function public.cbt_public_register_candidate(text,text) to authenticated;

revoke all on function public.cbt_public_get_offers() from public;
grant execute on function public.cbt_public_get_offers() to anon, authenticated;

revoke all on function public.cbt_public_create_offer(uuid,bigint,text,boolean,timestamptz,timestamptz) from public, anon;
grant execute on function public.cbt_public_create_offer(uuid,bigint,text,boolean,timestamptz,timestamptz) to authenticated;

revoke all on function public.cbt_public_create_order(uuid) from public, anon;
grant execute on function public.cbt_public_create_order(uuid) to authenticated;

revoke all on function public.cbt_public_confirm_payment(text,text,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.cbt_public_confirm_payment(text,text,bigint,text,jsonb) to service_role;

revoke all on function public.cbt_public_mark_payment_failed(text,text) from public, anon, authenticated;
grant execute on function public.cbt_public_mark_payment_failed(text,text) to service_role;

revoke all on function public.get_cbt_exam_results(uuid) from public, anon;
grant execute on function public.get_cbt_exam_results(uuid) to authenticated;
