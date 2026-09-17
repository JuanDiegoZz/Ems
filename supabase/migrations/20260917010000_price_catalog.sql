create table if not exists public.price_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  price integer not null check (price >= 0),
  unit text,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists price_catalog_active_order_idx on public.price_catalog (active, sort_order, name);

alter table public.price_catalog enable row level security;
revoke all on table public.price_catalog from anon, authenticated;
grant all on table public.price_catalog to service_role;

insert into public.price_catalog (name, category, price, unit, description, sort_order)
select seed.name, seed.category, seed.price, seed.unit, seed.description, seed.sort_order
from (values
  ('Reanimación', 'Servicios', 1000, null, 'Al reanimar completamente al paciente.', 10),
  ('Vendajes', 'Productos', 300, 'c/u', 'La ganancia es para ustedes.', 20),
  ('Analgésicos', 'Productos', 500, 'c/u', 'La ganancia es para ustedes.', 30),
  ('Curación', 'Servicios', 500, null, 'Al curar completamente al paciente.', 40)
) as seed(name, category, price, unit, description, sort_order)
where not exists (
  select 1
  from public.price_catalog existing
  where existing.name = seed.name and existing.category = seed.category
);
