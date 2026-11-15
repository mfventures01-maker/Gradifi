begin;

create table if not exists public.gradifi_exam_bodies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  country_code char(2) not null default 'NG',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gradifi_exam_programmes (
  id uuid primary key default gen_random_uuid(),
  exam_body_id uuid not null references public.gradifi_exam_bodies(id) on delete restrict,
  code text not null,
  name text not null,
  level text not null check (level in ('secondary','tertiary_entry','institutional')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exam_body_id, code),
  unique (exam_body_id, name)
);

create table if not exists public.gradifi_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.gradifi_exam_programmes(id) on delete restrict,
  year smallint not null check (year between 1950 and 2100),
  session_label text not null default 'Main',
  created_at timestamptz not null default now(),
  unique (programme_id, year, session_label)
);

create table if not exists public.gradifi_school_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  institution_name text not null,
  institution_category text not null check (institution_category in ('secondary','polytechnic','university','enterprise')),
  school_type text,
  registration_number text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  country_code char(2) not null default 'NG',
  state text,
  lga text,
  address text,
  website_url text,
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  institution_id uuid references public.institutions(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gradifi_school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('school_admin','principal','teacher','exam_officer')),
  status text not null default 'invited' check (status in ('invited','active','suspended','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create table if not exists public.gradifi_question_capture_batches (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  exam_session_id uuid references public.gradifi_exam_sessions(id) on delete restrict,
  subject_id uuid not null references public.subject_catalog(id) on delete restrict,
  status text not null default 'uploaded' check (status in ('uploaded','queued','processing','needs_review','approved','rejected','failed')),
  capture_method text not null default 'camera' check (capture_method in ('camera','file_upload','bulk_import')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gradifi_question_page_assets (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.gradifi_question_capture_batches(id) on delete cascade,
  storage_bucket text not null default 'gradifi-question-captures',
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  file_size_bytes bigint,
  sha256_hex text,
  page_number integer,
  image_width integer,
  image_height integer,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (file_size_bytes is null or file_size_bytes > 0),
  check (page_number is null or page_number > 0)
);

create table if not exists public.gradifi_question_ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.gradifi_question_capture_batches(id) on delete cascade,
  page_asset_id uuid not null references public.gradifi_question_page_assets(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','needs_review','failed')),
  engine_name text,
  engine_version text,
  extracted_payload jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (page_asset_id)
);

create table if not exists public.gradifi_question_bank_items (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.gradifi_exam_programmes(id) on delete restrict,
  exam_session_id uuid not null references public.gradifi_exam_sessions(id) on delete restrict,
  subject_id uuid not null references public.subject_catalog(id) on delete restrict,
  paper_code text,
  question_number text not null,
  topic text,
  subtopic text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  source_page_asset_id uuid references public.gradifi_question_page_assets(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exam_session_id, subject_id, paper_code, question_number)
);

create table if not exists public.gradifi_question_bank_versions (
  id uuid primary key default gen_random_uuid(),
  question_item_id uuid not null references public.gradifi_question_bank_items(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  question_type text not null default 'objective' check (question_type = 'objective'),
  question_text text not null,
  question_math_latex text,
  question_image_asset_id uuid references public.gradifi_question_page_assets(id) on delete set null,
  explanation_text text,
  explanation_math_latex text,
  review_status text not null default 'draft' check (review_status in ('draft','needs_review','approved','rejected','retired')),
  extraction_method text not null default 'manual' check (extraction_method in ('manual','ocr','manual_after_ocr')),
  extraction_confidence numeric(5,4) check (extraction_confidence between 0 and 1),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_item_id, version_number)
);

create table if not exists public.gradifi_question_bank_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.gradifi_question_bank_versions(id) on delete cascade,
  option_label text not null check (option_label in ('A','B','C','D','E','F')),
  option_text text not null,
  option_math_latex text,
  option_image_asset_id uuid references public.gradifi_question_page_assets(id) on delete set null,
  display_order smallint not null check (display_order between 1 and 6),
  created_at timestamptz not null default now(),
  unique (question_version_id, option_label),
  unique (question_version_id, display_order)
);

create table if not exists public.gradifi_question_bank_answer_keys (
  question_version_id uuid primary key references public.gradifi_question_bank_versions(id) on delete cascade,
  correct_option_id uuid not null references public.gradifi_question_bank_options(id) on delete restrict,
  explanation_text text,
  explanation_math_latex text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gradifi_exam_question_map (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.cbt_exams(id) on delete cascade,
  question_version_id uuid not null references public.gradifi_question_bank_versions(id) on delete restrict,
  display_order integer not null check (display_order > 0),
  marks numeric(8,2) not null default 1 check (marks > 0),
  created_at timestamptz not null default now(),
  unique (exam_id, display_order),
  unique (exam_id, question_version_id)
);

create table if not exists public.gradifi_exam_question_snapshots (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.cbt_exams(id) on delete cascade,
  source_question_version_id uuid references public.gradifi_question_bank_versions(id) on delete set null,
  display_order integer not null check (display_order > 0),
  question_payload jsonb not null,
  answer_key_payload jsonb not null,
  content_sha256 text not null,
  created_at timestamptz not null default now(),
  unique (exam_id, display_order)
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('principal_admin','teacher','student','examiner','individual'));

create index if not exists idx_gradifi_exam_programmes_body on public.gradifi_exam_programmes(exam_body_id);
create index if not exists idx_gradifi_exam_sessions_programme_year on public.gradifi_exam_sessions(programme_id, year desc);
create index if not exists idx_gradifi_school_requests_owner on public.gradifi_school_onboarding_requests(submitted_by, created_at desc);
create index if not exists idx_gradifi_school_requests_status on public.gradifi_school_onboarding_requests(status, created_at);
create index if not exists idx_gradifi_school_memberships_user on public.gradifi_school_memberships(user_id, status);
create index if not exists idx_gradifi_capture_owner on public.gradifi_question_capture_batches(submitted_by, created_at desc);
create index if not exists idx_gradifi_capture_status on public.gradifi_question_capture_batches(status, created_at);
create index if not exists idx_gradifi_ocr_jobs_status on public.gradifi_question_ocr_jobs(status, created_at);
create index if not exists idx_gradifi_bank_lookup on public.gradifi_question_bank_items(programme_id, exam_session_id, subject_id);
create index if not exists idx_gradifi_bank_versions_status on public.gradifi_question_bank_versions(review_status, question_item_id);
create index if not exists idx_gradifi_exam_question_map_exam on public.gradifi_exam_question_map(exam_id, display_order);

alter table public.gradifi_exam_bodies enable row level security;
alter table public.gradifi_exam_programmes enable row level security;
alter table public.gradifi_exam_sessions enable row level security;
alter table public.gradifi_school_onboarding_requests enable row level security;
alter table public.gradifi_school_memberships enable row level security;
alter table public.gradifi_question_capture_batches enable row level security;
alter table public.gradifi_question_page_assets enable row level security;
alter table public.gradifi_question_ocr_jobs enable row level security;
alter table public.gradifi_question_bank_items enable row level security;
alter table public.gradifi_question_bank_versions enable row level security;
alter table public.gradifi_question_bank_options enable row level security;
alter table public.gradifi_question_bank_answer_keys enable row level security;
alter table public.gradifi_exam_question_map enable row level security;
alter table public.gradifi_exam_question_snapshots enable row level security;

create policy "exam bodies readable" on public.gradifi_exam_bodies for select to anon, authenticated using (is_active);
create policy "exam programmes readable" on public.gradifi_exam_programmes for select to anon, authenticated using (is_active);
create policy "exam sessions readable" on public.gradifi_exam_sessions for select to anon, authenticated using (true);

create policy "school applicant reads own requests" on public.gradifi_school_onboarding_requests
 for select to authenticated using (submitted_by = (select auth.uid()));
create policy "school applicant creates own request" on public.gradifi_school_onboarding_requests
 for insert to authenticated with check (submitted_by = (select auth.uid()));
create policy "school applicant updates pending own request" on public.gradifi_school_onboarding_requests
 for update to authenticated using (submitted_by = (select auth.uid()) and status in ('pending','under_review'))
 with check (submitted_by = (select auth.uid()) and status in ('pending','withdrawn'));

create policy "members read own memberships" on public.gradifi_school_memberships
 for select to authenticated using (user_id = (select auth.uid()));

create policy "capture owner reads own batches" on public.gradifi_question_capture_batches
 for select to authenticated using (submitted_by = (select auth.uid()));
create policy "capture owner creates batch" on public.gradifi_question_capture_batches
 for insert to authenticated with check (submitted_by = (select auth.uid()));
create policy "capture owner reads own page assets" on public.gradifi_question_page_assets
 for select to authenticated using (exists (select 1 from public.gradifi_question_capture_batches b where b.id=batch_id and b.submitted_by=(select auth.uid())));
create policy "capture owner creates own page assets" on public.gradifi_question_page_assets
 for insert to authenticated with check (exists (select 1 from public.gradifi_question_capture_batches b where b.id=batch_id and b.submitted_by=(select auth.uid())));
create policy "capture owner reads own OCR jobs" on public.gradifi_question_ocr_jobs
 for select to authenticated using (exists (select 1 from public.gradifi_question_capture_batches b where b.id=batch_id and b.submitted_by=(select auth.uid())));

create policy "published bank items are public" on public.gradifi_question_bank_items
 for select to anon, authenticated using (
  exists (select 1 from public.gradifi_question_bank_versions v where v.question_item_id=id and v.review_status='approved')
);
create policy "approved question versions are public" on public.gradifi_question_bank_versions
 for select to anon, authenticated using (review_status='approved');
create policy "approved question options are public" on public.gradifi_question_bank_options
 for select to anon, authenticated using (
  exists (select 1 from public.gradifi_question_bank_versions v where v.id=question_version_id and v.review_status='approved')
);

-- Answer keys intentionally have no client SELECT policy. Reveal must occur through a
-- controlled post-submission/practice-result RPC, never through the public question feed.
-- Exam maps and snapshots are likewise not directly exposed to clients in this migration.

grant select on public.gradifi_exam_bodies, public.gradifi_exam_programmes, public.gradifi_exam_sessions to anon, authenticated;
grant select on public.gradifi_question_bank_items, public.gradifi_question_bank_versions, public.gradifi_question_bank_options to anon, authenticated;
grant select, insert, update on public.gradifi_school_onboarding_requests to authenticated;
grant select on public.gradifi_school_memberships to authenticated;
grant select, insert on public.gradifi_question_capture_batches, public.gradifi_question_page_assets to authenticated;
grant select on public.gradifi_question_ocr_jobs to authenticated;

commit;