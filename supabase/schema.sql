-- CERCA Reencuentro schema v3
-- Ejecuta esto en Supabase SQL Editor. Migra v1/v2 sin perder datos.

create extension if not exists pgcrypto;

do $$ begin
  create type case_status as enum ('missing','possibly_found','verifying_location','found_alive','reunified','duplicate','discarded');
exception when duplicate_object then null; end $$;

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
  photo_url text,
  status case_status not null default 'missing',
  last_seen_location text not null,
  last_seen_at timestamptz,
  current_location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  verification_status verification_status not null default 'pending',
  visibility visibility_level not null default 'private',
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-photos','case-photos',true,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-evidence','private-evidence',false,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = 5242880;

create or replace view public_person_cases as
select id, public_code, full_name, approximate_age, photo_url, status, last_seen_location, last_seen_at, current_location, description, view_count, share_count, created_at, updated_at
from person_cases
where status not in ('discarded','duplicate');

create or replace view public_case_stats as
select
  count(*) filter (where status not in ('discarded','duplicate'))::int as total_cases,
  count(*) filter (where status = 'missing')::int as still_missing,
  count(*) filter (where status in ('found_alive','reunified'))::int as found_or_reunified,
  count(*) filter (where status in ('possibly_found','verifying_location'))::int as in_verification
from person_cases;

create or replace view public_aid_resources as
select id, kind, title, location, description, contact_name, contact_phone, source_url, priority, is_published, created_at, updated_at
from aid_resources
where is_published = true;

alter table person_cases enable row level security;
alter table case_reports enable row level security;
alter table verification_logs enable row level security;
alter table otp_codes enable row level security;
alter table aid_resources enable row level security;

drop policy if exists "Service role can manage person_cases" on person_cases;
drop policy if exists "Service role can manage case_reports" on case_reports;
drop policy if exists "Service role can manage verification_logs" on verification_logs;
drop policy if exists "Service role can manage otp_codes" on otp_codes;
drop policy if exists "Service role can manage aid_resources" on aid_resources;

create policy "Service role can manage person_cases" on person_cases for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage case_reports" on case_reports for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage verification_logs" on verification_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage otp_codes" on otp_codes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role can manage aid_resources" on aid_resources for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select on public_person_cases to anon, authenticated;
grant select on public_case_stats to anon, authenticated;
grant select on public_aid_resources to anon, authenticated;

create index if not exists idx_person_cases_public_code on person_cases(public_code);
create index if not exists idx_person_cases_status on person_cases(status);
create index if not exists idx_person_cases_owner_email on person_cases(owner_email);
create index if not exists idx_person_cases_updated_at on person_cases(updated_at desc);
create index if not exists idx_person_cases_name on person_cases using gin (to_tsvector('spanish', full_name));
create index if not exists idx_case_reports_person_id on case_reports(person_id);
create index if not exists idx_case_reports_created_at on case_reports(created_at desc);
create index if not exists idx_otp_codes_email_created_at on otp_codes(email, created_at desc);
create index if not exists idx_aid_resources_kind on aid_resources(kind);
create index if not exists idx_aid_resources_published on aid_resources(is_published, updated_at desc);
