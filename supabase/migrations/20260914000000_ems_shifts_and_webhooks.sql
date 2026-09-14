begin;

create table if not exists public.ems_shifts (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  discord_open_status text,
  discord_open_error text,
  discord_close_status text,
  discord_close_error text,
  created_at timestamptz not null default now(),
  constraint ems_shifts_ended_after_start check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists ems_shifts_one_open_per_profile on public.ems_shifts (profile_id) where ended_at is null;
create index if not exists ems_shifts_profile_started_idx on public.ems_shifts (profile_id, started_at desc);

create table if not exists public.ems_discord_webhooks (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  iv text not null,
  ciphertext text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ems_shifts enable row level security;
alter table public.ems_discord_webhooks enable row level security;
revoke all on table public.ems_shifts, public.ems_discord_webhooks from anon, authenticated;
grant all on table public.ems_shifts, public.ems_discord_webhooks to service_role;

commit;
