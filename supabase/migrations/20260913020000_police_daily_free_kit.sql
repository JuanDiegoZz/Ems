begin;

create table public.app_settings (
  id boolean primary key default true check (id),
  police_daily_free_kit_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.deliveries
  add column is_daily_free_kit boolean not null default false,
  add column daily_free_kit_date date;

create unique index deliveries_one_daily_free_police_kit
  on public.deliveries (person_id, daily_free_kit_date)
  where is_daily_free_kit = true;

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant all on table public.app_settings to service_role;

commit;
