-- CERCA Reencuentro schema v4
-- Ejecuta esto en Supabase SQL Editor. Migra v1/v2/v3 sin perder datos.

create extension if not exists pgcrypto;

do $$ begin
  create type case_status as enum (
    'missing',
    'possibly_found',
    'verifying_location',
    'found_alive',
    'possible_match',
    'reviewing_match',
    'located',
    'safe',
    'hospitalized',
    'reunification_in_progress',
    'reunified',
    'duplicate',
    'discarded'
  );
exception when duplicate_object then null; end $$;

do $$
declare
  status_value text;
begin
  foreach status_value in array array[
    'missing',
    'possibly_found',
    'verifying_location',
    'found_alive',
    'possible_match',
    'reviewing_match',
    'located',
    'safe',
    'hospitalized',
    'reunification_in_progress',
    'reunified',
    'duplicate',
    'discarded'
  ]
  loop
    execute format('alter type case_status add value if not exists %L', status_value);
  end loop;
end $$;

do $$ begin
  create type report_type as enum ('missing','safe','found','sighting','needs_help');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending','reviewing','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility_level as enum ('public','restricted','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type aid_kind as enum ('collection_center','specific_request','news','emergency_contact','tip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type aid_priority as enum ('normal','high','critical');
exception when duplicate_object then null; end $$;

create table if not exists person_cases (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null,
  full_name text not null,
  approximate_age int,
  document_id text,
  document_last4 text,
  photo_url text,
  status case_status not null default 'missing',
  last_seen_location text not null,
  last_seen_at timestamptz,
  current_location text,
  description text,
  owner_token_hash text,
  owner_email text,
  owner_name text,
  view_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table person_cases add column if not exists document_id text;
alter table person_cases add column if not exists document_last4 text;
alter table person_cases add column if not exists owner_token_hash text;
alter table person_cases add column if not exists owner_email text;
alter table person_cases add column if not exists owner_name text;
alter table person_cases add column if not exists view_count int not null default 0;
alter table person_cases add column if not exists share_count int not null default 0;
alter table person_cases add column if not exists current_location text;

create table if not exists case_reports (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person_cases(id) on delete cascade,
  report_type report_type not null,
  reporter_name text not null,
  reporter_phone text not null,
  reporter_email text,
  reporter_relationship text,
  seen_location text,
  seen_at timestamptz,
  notes text,
  evidence_url text,
  evidence_file_path text,
  verification_status verification_status not null default 'pending',
  visibility visibility_level not null default 'private',
  visible_to_owner boolean not null default true,
  created_at timestamptz not null default now()
);

alter table case_reports add column if not exists evidence_file_path text;
alter table case_reports add column if not exists visible_to_owner boolean not null default true;

create table if not exists verification_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person_cases(id) on delete cascade,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists report_drafts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null default 'login',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists aid_resources (
  id uuid primary key default gen_random_uuid(),
  kind aid_kind not null,
  title text not null,
  location text,
  description text not null,
  contact_name text,
  contact_phone text,
  source_url text,
  priority aid_priority not null default 'normal',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists case_subscriptions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person_cases(id) on delete cascade,
  email text not null,
  subscriber_name text,
  code_hash text,
  status text not null default 'pending',
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id, email)
);

create table if not exists survivor_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid,
  full_name text not null,
  normalized_name text,
  approximate_age int,
  document_id text,
  document_last4 text,
  hospital text,
  phone text,
  address text,
  notes text,
  source_name text,
  source_file_name text,
  source_sheet text,
  imported_by_email text,
  verification_status text not null default 'pending',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  phone text,
  phone_verified_at timestamptz,
  role text not null default 'public_registered',
  organization_name text,
  center_name text,
  zone text,
  ci_number text,
  ci_photo_path text,
  profile_photo_path text,
  verification_status text default 'self_registered',
  trust_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists upload_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by_email text,
  uploaded_by_name text,
  uploaded_by_phone text,
  source_name text,
  source_location text,
  original_file_path text,
  evidence_file_path text,
  row_count int default 0,
  created_at timestamptz default now()
);

create table if not exists found_records (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null,
  upload_batch_id uuid references upload_batches(id) on delete set null,
  created_by_email text,
  created_by_name text,
  created_by_phone text,
  source_name text,
  full_name text,
  normalized_name text,
  document_id text,
  document_last4 text,
  approximate_age int,
  apparent_gender text,
  photo_url text,
  photo_path text,
  evidence_file_path text,
  status text not null default 'unidentified',
  sensitivity_level text not null default 'normal',
  found_location text,
  current_location text,
  destination text,
  notes_public text,
  notes_private text,
  found_at timestamptz,
  admitted_at timestamptz,
  transferred_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table found_records drop constraint if exists found_records_status_check;
alter table found_records add constraint found_records_status_check check (status in (
  'unidentified',
  'partially_identified',
  'identity_probable',
  'identity_confirmed_by_family',
  'identity_confirmed_by_center',
  'safe',
  'hospitalized',
  'transferred',
  'deceased_unidentified',
  'deceased_identity_probable',
  'deceased_identity_confirmed',
  'family_notified',
  'released_to_family',
  'minor_unaccompanied',
  'minor_temporary_care',
  'reunification_in_progress',
  'reunified',
  'restricted',
  'discarded'
)) not valid;

create table if not exists found_record_reports (
  id uuid primary key default gen_random_uuid(),
  found_record_id uuid references found_records(id) on delete cascade,
  reporter_name text not null,
  reporter_phone text,
  reporter_email text,
  source_name text,
  report_type text not null default 'found_update',
  location text,
  notes text,
  evidence_file_path text,
  verification_status text default 'pending',
  visibility text default 'private',
  created_at timestamptz default now()
);

create table if not exists generic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  email text not null,
  subscriber_name text,
  code_hash text,
  status text not null default 'pending',
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(subject_type, subject_id, email)
);

create table if not exists possible_matches (
  id uuid primary key default gen_random_uuid(),
  missing_case_id uuid references person_cases(id) on delete cascade,
  found_record_id uuid references found_records(id) on delete cascade,
  match_type text not null default 'manual',
  score numeric,
  status text not null default 'pending',
  notified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists trust_events (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  event_type text not null,
  points int not null default 0,
  notes text,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-photos','case-photos',true,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-evidence','private-evidence',false,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

drop view if exists public_upload_batches;
drop view if exists public_found_records;
drop view if exists public_survivor_records;
drop view if exists public_aid_resources;
drop view if exists public_case_stats;
drop view if exists public_person_cases;

create view public_person_cases as
select
  id,
  public_code,
  full_name,
  approximate_age,
  document_last4,
  photo_url,
  status,
  last_seen_location,
  last_seen_at,
  current_location,
  description,
  view_count,
  share_count,
  created_at,
  updated_at
from person_cases
where status::text not in ('discarded','duplicate');

create view public_found_records as
select
  id,
  public_code,
  full_name,
  document_last4,
  approximate_age,
  apparent_gender,
  photo_url,
  status,
  sensitivity_level,
  source_name,
  found_location,
  current_location,
  destination,
  notes_public,
  found_at,
  admitted_at,
  transferred_at,
  verified_at,
  created_at,
  updated_at
from found_records
where status <> 'discarded'
  and sensitivity_level in ('normal','restricted');

create view public_case_stats as
select
  (select count(*) from person_cases where status::text not in ('discarded','duplicate'))::int as missing_count,
  (select count(*) from found_records where status <> 'discarded')::int as found_count,
  (select count(*) from found_records where status = 'unidentified')::int as unidentified_count,
  (
    (select count(*) from person_cases where status::text = 'hospitalized') +
    (select count(*) from found_records where status = 'hospitalized')
  )::int as hospitalized_count,
  (
    (select count(*) from person_cases where status::text = 'safe') +
    (select count(*) from found_records where status = 'safe')
  )::int as safe_count,
  (
    (select count(*) from person_cases where status::text = 'reunified') +
    (select count(*) from found_records where status in ('reunified','released_to_family'))
  )::int as reunified_count,
  (select count(*) from found_records where status = 'deceased_unidentified')::int as deceased_unidentified_count,
  (select count(*) from person_cases where status::text not in ('discarded','duplicate'))::int as total_cases,
  (select count(*) from person_cases where status::text = 'missing')::int as still_missing,
  (
    (select count(*) from person_cases where status::text in ('located','safe','hospitalized','found_alive','reunified')) +
    (select count(*) from found_records where status in ('safe','hospitalized','reunified','released_to_family'))
  )::int as found_or_reunified,
  (select count(*) from person_cases where status::text in ('possibly_found','verifying_location','possible_match','reviewing_match'))::int as in_verification;

create view public_upload_batches as
select
  id,
  source_name,
  source_location,
  row_count,
  created_at
from upload_batches;

create view public_aid_resources as
select id, kind, title, location, description, contact_name, contact_phone, source_url, priority, is_published, created_at, updated_at
from aid_resources
where is_published = true;

create view public_survivor_records as
select
  id,
  full_name,
  approximate_age,
  document_last4,
  hospital,
  address,
  notes,
  source_name,
  source_sheet,
  verification_status,
  created_at,
  updated_at
from survivor_records
where is_published = true;

alter table person_cases enable row level security;
alter table case_reports enable row level security;
alter table verification_logs enable row level security;
alter table report_drafts enable row level security;
alter table otp_codes enable row level security;
alter table aid_resources enable row level security;
alter table case_subscriptions enable row level security;
alter table survivor_records enable row level security;
alter table volunteer_profiles enable row level security;
alter table upload_batches enable row level security;
alter table found_records enable row level security;
alter table found_record_reports enable row level security;
alter table generic_subscriptions enable row level security;
alter table possible_matches enable row level security;
alter table trust_events enable row level security;

drop policy if exists "Service role can manage person_cases" on person_cases;
drop policy if exists "Service role can manage case_reports" on case_reports;
drop policy if exists "Service role can manage verification_logs" on verification_logs;
drop policy if exists "Service role can manage report_drafts" on report_drafts;
drop policy if exists "Service role can manage otp_codes" on otp_codes;
drop policy if exists "Service role can manage aid_resources" on aid_resources;
drop policy if exists "Service role can manage case_subscriptions" on case_subscriptions;
drop policy if exists "Service role can manage survivor_records" on survivor_records;
drop policy if exists "Service role can manage volunteer_profiles" on volunteer_profiles;
drop policy if exists "Service role can manage upload_batches" on upload_batches;
drop policy if exists "Service role can manage found_records" on found_records;
drop policy if exists "Service role can manage found_record_reports" on found_record_reports;
drop policy if exists "Service role can manage generic_subscriptions" on generic_subscriptions;
drop policy if exists "Service role can manage possible_matches" on possible_matches;
drop policy if exists "Service role can manage trust_events" on trust_events;

create policy "Service role can manage person_cases" on person_cases for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage case_reports" on case_reports for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage verification_logs" on verification_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage report_drafts" on report_drafts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage otp_codes" on otp_codes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage aid_resources" on aid_resources for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage case_subscriptions" on case_subscriptions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage survivor_records" on survivor_records for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage volunteer_profiles" on volunteer_profiles for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage upload_batches" on upload_batches for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage found_records" on found_records for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage found_record_reports" on found_record_reports for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage generic_subscriptions" on generic_subscriptions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage possible_matches" on possible_matches for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage trust_events" on trust_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select on public_person_cases to anon, authenticated;
grant select on public_found_records to anon, authenticated;
grant select on public_case_stats to anon, authenticated;
grant select on public_upload_batches to anon, authenticated;
grant select on public_aid_resources to anon, authenticated;
grant select on public_survivor_records to anon, authenticated;

create index if not exists idx_person_cases_public_code on person_cases(public_code);
create index if not exists idx_person_cases_status on person_cases(status);
create index if not exists idx_person_cases_document_id on person_cases(document_id);
create index if not exists idx_person_cases_document_last4 on person_cases(document_last4);
create index if not exists idx_person_cases_owner_email on person_cases(owner_email);
create index if not exists idx_person_cases_created_at on person_cases(created_at desc);
create index if not exists idx_person_cases_updated_at on person_cases(updated_at desc);
create index if not exists idx_person_cases_name on person_cases using gin (to_tsvector('spanish', full_name));
create index if not exists idx_case_reports_person_id on case_reports(person_id);
create index if not exists idx_case_reports_created_at on case_reports(created_at desc);
create index if not exists idx_report_drafts_email_created_at on report_drafts(email, created_at desc);
create index if not exists idx_otp_codes_email_created_at on otp_codes(email, created_at desc);
create index if not exists idx_aid_resources_kind on aid_resources(kind);
create index if not exists idx_aid_resources_published on aid_resources(is_published, updated_at desc);
create index if not exists idx_case_subscriptions_person_id on case_subscriptions(person_id);
create index if not exists idx_case_subscriptions_email on case_subscriptions(email);
create index if not exists idx_case_subscriptions_unsubscribe_token on case_subscriptions(unsubscribe_token);
create index if not exists idx_survivor_records_document_id on survivor_records(document_id);
create index if not exists idx_survivor_records_document_last4 on survivor_records(document_last4);
create index if not exists idx_survivor_records_normalized_name on survivor_records(normalized_name);
create index if not exists idx_survivor_records_created_at on survivor_records(created_at desc);
create index if not exists idx_volunteer_profiles_email on volunteer_profiles(email);
create index if not exists idx_volunteer_profiles_role on volunteer_profiles(role);
create index if not exists idx_volunteer_profiles_verification_status on volunteer_profiles(verification_status);
create index if not exists idx_upload_batches_created_at on upload_batches(created_at desc);
create index if not exists idx_found_records_public_code on found_records(public_code);
create index if not exists idx_found_records_status on found_records(status);
create index if not exists idx_found_records_document_id on found_records(document_id);
create index if not exists idx_found_records_document_last4 on found_records(document_last4);
create index if not exists idx_found_records_normalized_name on found_records(normalized_name);
create index if not exists idx_found_records_created_at on found_records(created_at desc);
create index if not exists idx_found_records_updated_at on found_records(updated_at desc);
create index if not exists idx_found_records_upload_batch_id on found_records(upload_batch_id);
create index if not exists idx_found_records_created_by_email on found_records(created_by_email);
create index if not exists idx_found_record_reports_found_record_id on found_record_reports(found_record_id);
create index if not exists idx_found_record_reports_created_at on found_record_reports(created_at desc);
create index if not exists idx_generic_subscriptions_subject on generic_subscriptions(subject_type, subject_id);
create index if not exists idx_generic_subscriptions_email on generic_subscriptions(email);
create index if not exists idx_generic_subscriptions_unsubscribe_token on generic_subscriptions(unsubscribe_token);
create index if not exists idx_possible_matches_missing_case_id on possible_matches(missing_case_id);
create index if not exists idx_possible_matches_found_record_id on possible_matches(found_record_id);
create index if not exists idx_possible_matches_status on possible_matches(status);
create index if not exists idx_trust_events_actor_email on trust_events(actor_email);
create index if not exists idx_trust_events_created_at on trust_events(created_at desc);
