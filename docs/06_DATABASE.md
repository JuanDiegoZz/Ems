# 06 — Base de datos

## Principios

- UUID como PK.
- Timestamps `timestamptz` en UTC.
- Soft delete/archive donde preservar historial sea importante.
- Índices en campos de búsqueda.
- Contraseñas no viven en tablas de la app: Supabase Auth las maneja.

## Enums sugeridos

```sql
create type app_role as enum ('admin', 'ems');
create type person_type as enum ('civil', 'police');
create type delivery_type as enum ('civil', 'police');
create type delivery_status as enum ('pending', 'sent', 'failed');
```

## profiles

Vinculado 1:1 con `auth.users`.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique,
  rp_name text not null,
  role app_role not null default 'ems',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Reglas:

- `username` normalizado en minúsculas.
- Username inmutable en V1.
- `rp_name` sí puede cambiarlo un admin.
- Desactivar, no borrar.

## people

```sql
create table public.people (
  id uuid primary key default gen_random_uuid(),
  type person_type not null,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  search_name text not null,
  badge_number text,
  ine_path text,
  badge_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint civil_requires_ine check (type <> 'civil' or ine_path is not null),
  constraint police_requires_identity check (
    type <> 'police' or ine_path is not null or badge_number is not null or badge_path is not null
  )
);
```

`display_name`: `Manolo Durango`.

`search_name`: normalizado en minúsculas, sin tildes y con espacios colapsados. Calcular en servidor con una sola función compartida.

Índices:

```sql
create index people_search_name_idx on public.people(search_name);
create unique index people_badge_unique_active
  on public.people(badge_number)
  where type = 'police' and archived_at is null;
```

No hacer UNIQUE en nombre: puede haber dos personajes con el mismo nombre.

## deliveries

```sql
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  person_id uuid not null references public.people(id),
  delivered_by uuid not null references public.profiles(id),
  type delivery_type not null,
  quantity_label varchar(32) not null,
  occurred_at timestamptz not null default now(),
  status delivery_status not null default 'pending',
  discord_message_id text,
  discord_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index deliveries_person_idx on public.deliveries(person_id, occurred_at desc);
create index deliveries_user_idx on public.deliveries(delivered_by, occurred_at desc);
create index deliveries_date_idx on public.deliveries(occurred_at desc);
```

## ems_shifts y ems_discord_webhooks

La migración `supabase/migrations/20260914000000_ems_shifts_and_webhooks.sql` añade ambos modelos sin alterar datos existentes. `ems_shifts` conserva `started_at` y `ended_at` como `timestamptz`; la duración siempre se deriva de esos valores. El índice parcial `ems_shifts_one_open_per_profile` impide dos turnos abiertos por EMS y `ems_shifts_profile_started_idx` acelera sus analíticas.

`ems_discord_webhooks` sólo contiene IV, ciphertext y tag de autenticación AES-GCM. Tiene RLS, grants revocados para browser y acceso exclusivamente mediante `service_role`.

## Opcional: admin_events

Implementar solo si no retrasa V1.

```sql
create table public.admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Útil para crear/desactivar/resetear usuarios y editar personas.

## RLS/grants

Aunque el acceso de negocio sea server-only:

- Habilitar RLS en tablas expuestas.
- Revocar grants innecesarios de `anon` y `authenticated`.
- Secret/service role solo en servidor.
- Nunca incluir key secreta en cliente.

## Migraciones

Todas las estructuras y cambios se guardan en migraciones versionadas dentro de `supabase/migrations/`.

No depender de cambios manuales permanentes en dashboard.

El módulo Staff Discipline + Weekly Bonuses añade sus estructuras mediante
`20260915000000_staff_discipline_and_bonuses.sql` y la corrección de auditoría
`20260917000000_fix_bonus_review_audit.sql`, en ese orden. El procedimiento
manual de producción está en [`docs/24_STAFF_DISCIPLINE_AND_BONUSES.md`](24_STAFF_DISCIPLINE_AND_BONUSES.md).
