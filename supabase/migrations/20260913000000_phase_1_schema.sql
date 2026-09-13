begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'ems');
create type public.person_type as enum ('civil', 'police');
create type public.delivery_type as enum ('civil', 'police');
create type public.delivery_status as enum ('pending', 'sent', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique,
  rp_name text not null,
  role public.app_role not null default 'ems',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._-]{3,32}$')
);

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  type public.person_type not null,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  search_name text not null,
  badge_number text,
  ine_path text not null,
  badge_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint police_requires_badge_number check (type <> 'police' or badge_number is not null)
);

create table public.deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  client_request_id uuid not null unique,
  person_id uuid not null references public.people(id),
  delivered_by uuid not null references public.profiles(id),
  type public.delivery_type not null,
  quantity_label varchar(32) not null,
  occurred_at timestamptz not null default now(),
  status public.delivery_status not null default 'pending',
  discord_message_id text,
  discord_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index people_search_name_idx on public.people(search_name);
create unique index people_badge_unique_active
  on public.people(badge_number)
  where type = 'police' and archived_at is null;
create index deliveries_person_idx on public.deliveries(person_id, occurred_at desc);
create index deliveries_user_idx on public.deliveries(delivered_by, occurred_at desc);
create index deliveries_date_idx on public.deliveries(occurred_at desc);

alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.deliveries enable row level security;

revoke all on table public.profiles, public.people, public.deliveries from anon, authenticated;
revoke all on table storage.buckets, storage.objects from anon, authenticated;
grant all on table public.profiles, public.people, public.deliveries to service_role;
grant all on table storage.buckets, storage.objects to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rp-documents',
  'rp-documents',
  false,
  1572864,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
