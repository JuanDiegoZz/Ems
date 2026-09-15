begin;

do $$ begin create type public.disciplinary_action_type as enum ('warn', 'strike', 'fine'); exception when duplicate_object then null; end $$;
do $$ begin create type public.bonus_run_status as enum ('draft', 'finalized'); exception when duplicate_object then null; end $$;

create table public.disciplinary_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  type public.disciplinary_action_type not null,
  reason text not null check (length(trim(reason)) > 0),
  fine_amount integer,
  applies_to_week date,
  related_action_id uuid references public.disciplinary_actions(id) on delete restrict,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  issued_at timestamptz not null default now(),
  generated_from_warns boolean not null default false,
  triggered_by_warn_id uuid references public.disciplinary_actions(id) on delete restrict,
  converted_to_strike_id uuid references public.disciplinary_actions(id) on delete restrict,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  void_reason text,
  constraint disciplinary_fine_fields check (
    (type = 'fine' and fine_amount > 0 and applies_to_week is not null and extract(isodow from applies_to_week) = 1)
    or (type <> 'fine' and fine_amount is null and applies_to_week is null)
  ),
  constraint disciplinary_related_fine check (related_action_id is null or type = 'fine'),
  constraint disciplinary_generated_strike check ((not generated_from_warns and triggered_by_warn_id is null) or (generated_from_warns and type = 'strike' and triggered_by_warn_id is not null)),
  constraint disciplinary_void_audit check ((voided_at is null and voided_by is null and void_reason is null) or (voided_at is not null and voided_by is not null and length(trim(void_reason)) > 0))
);

create index disciplinary_actions_active_profile_idx on public.disciplinary_actions(profile_id, type, issued_at) where voided_at is null;
create index disciplinary_actions_fine_week_idx on public.disciplinary_actions(profile_id, applies_to_week) where type = 'fine' and voided_at is null;
create index disciplinary_actions_conversion_idx on public.disciplinary_actions(converted_to_strike_id) where converted_to_strike_id is not null;

create table public.justified_absences (
  id uuid primary key default extensions.gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete restrict,
  starts_on date not null, ends_on date not null, reason text not null check (length(trim(reason)) > 0),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  voided_at timestamptz, voided_by uuid references public.profiles(id) on delete restrict, void_reason text,
  constraint justified_absence_dates check (ends_on >= starts_on),
  constraint justified_absence_void_audit check ((voided_at is null and voided_by is null and void_reason is null) or (voided_at is not null and voided_by is not null and length(trim(void_reason)) > 0))
);
create index justified_absences_profile_dates_idx on public.justified_absences(profile_id, starts_on, ends_on) where voided_at is null;

create table public.bonus_settings (
  id boolean primary key default true check (id), weekly_goal_minutes integer not null default 300 check (weekly_goal_minutes > 0),
  peak_start time not null default '22:00', peak_end time not null default '04:00', active_day_minimum_minutes integer not null default 30 check (active_day_minimum_minutes > 0),
  peak_target_minutes integer not null default 2520 check (peak_target_minutes > 0), normal_target_minutes integer not null default 600 check (normal_target_minutes > 0), kits_target integer not null default 25 check (kits_target > 0), active_days_target integer not null default 5 check (active_days_target > 0),
  peak_weight integer not null default 50, kits_weight integer not null default 25, normal_weight integer not null default 10, consistency_weight integer not null default 15,
  inactivity_alert_days integer not null default 3 check (inactivity_alert_days > 0), warns_per_strike integer not null default 3 check (warns_per_strike > 0), critical_strikes integer not null default 3 check (critical_strikes > 0),
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete restrict,
  constraint bonus_settings_weights check (peak_weight + kits_weight + normal_weight + consistency_weight = 100)
);
insert into public.bonus_settings(id) values (true) on conflict (id) do nothing;

create table public.bonus_tiers (
  id uuid primary key default extensions.gen_random_uuid(), position integer not null unique check (position >= 0), min_score integer not null check (min_score between 0 and 100), max_score integer not null check (max_score between 0 and 100 and max_score >= min_score), amount integer not null check (amount >= 0)
);
insert into public.bonus_tiers(position,min_score,max_score,amount) values (0,85,100,60000),(1,75,84,55000),(2,65,74,50000),(3,50,64,40000),(4,0,49,20000) on conflict (position) do nothing;

create table public.bonus_runs (
  id uuid primary key default extensions.gen_random_uuid(), week_start date not null unique check (extract(isodow from week_start) = 1), status public.bonus_run_status not null default 'draft',
  config_snapshot jsonb not null default '{}'::jsonb, created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), finalized_by uuid references public.profiles(id) on delete restrict, finalized_at timestamptz,
  constraint bonus_run_final_audit check ((status = 'draft' and finalized_by is null and finalized_at is null) or (status = 'finalized' and finalized_by is not null and finalized_at is not null))
);
create index bonus_runs_status_week_idx on public.bonus_runs(status, week_start desc);

create table public.bonus_results (
  id uuid primary key default extensions.gen_random_uuid(), run_id uuid not null references public.bonus_runs(id) on delete restrict, profile_id uuid not null references public.profiles(id) on delete restrict,
  weekly_minutes integer not null default 0 check (weekly_minutes >= 0), peak_minutes integer not null default 0 check (peak_minutes >= 0), normal_minutes integer not null default 0 check (normal_minutes >= 0), kits integer not null default 0 check (kits >= 0), active_days integer not null default 0 check (active_days >= 0),
  peak_score numeric(5,2) not null default 0, kits_score numeric(5,2) not null default 0, normal_score numeric(5,2) not null default 0, consistency_score numeric(5,2) not null default 0, total_score numeric(5,2) not null default 0,
  base_amount integer not null default 0 check (base_amount >= 0), fine_total integer not null default 0 check (fine_total >= 0), recommended_final_amount integer not null default 0 check (recommended_final_amount >= 0),
  review_required boolean not null default false, review_resolved_at timestamptz, review_resolved_by uuid references public.profiles(id) on delete restrict, review_reason text,
  override_amount integer, override_reason text, override_by uuid references public.profiles(id) on delete restrict, override_at timestamptz, final_amount integer,
  unique(run_id, profile_id),
  constraint bonus_review_audit check ((review_resolved_at is null and review_resolved_by is null and review_reason is null) or (review_resolved_at is not null and review_resolved_by is not null and length(trim(review_reason)) > 0)),
  constraint bonus_override_audit check ((override_amount is null and override_reason is null and override_by is null and override_at is null) or (override_amount is not null and override_amount >= 0 and override_by is not null and override_at is not null and length(trim(override_reason)) > 0))
);
create index bonus_results_run_rank_idx on public.bonus_results(run_id, total_score desc, peak_minutes desc, profile_id);

alter table public.disciplinary_actions enable row level security; alter table public.justified_absences enable row level security; alter table public.bonus_settings enable row level security; alter table public.bonus_tiers enable row level security; alter table public.bonus_runs enable row level security; alter table public.bonus_results enable row level security;
revoke all on table public.disciplinary_actions, public.justified_absences, public.bonus_settings, public.bonus_tiers, public.bonus_runs, public.bonus_results from anon, authenticated;
grant all on table public.disciplinary_actions, public.justified_absences, public.bonus_settings, public.bonus_tiers, public.bonus_runs, public.bonus_results to service_role;

create function public.record_disciplinary_action(p_profile_id uuid,p_type public.disciplinary_action_type,p_reason text,p_issued_by uuid,p_fine_amount integer default null,p_applies_to_week date default null,p_related_action_id uuid default null)
returns table(action_id uuid, generated_strike_id uuid, active_strike_count integer) language plpgsql security definer set search_path = '' as $$
declare v_action public.disciplinary_actions%rowtype; v_threshold integer; v_warn_ids uuid[]; v_trigger uuid; v_strike uuid;
begin
  if not exists (select 1 from public.profiles where id=p_issued_by and active and role='admin') then raise exception 'Forbidden' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles where id=p_profile_id) then raise exception 'EMS no encontrado' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_profile_id::text, 0));
  if length(trim(coalesce(p_reason,'')))=0 then raise exception 'Motivo requerido'; end if;
  if p_type='fine' and (p_fine_amount is null or p_fine_amount <= 0 or p_applies_to_week is null or extract(isodow from p_applies_to_week) <> 1) then raise exception 'Multa inválida'; end if;
  if p_type <> 'fine' and (p_fine_amount is not null or p_applies_to_week is not null or p_related_action_id is not null) then raise exception 'Campos inválidos'; end if;
  if p_related_action_id is not null and not exists (select 1 from public.disciplinary_actions where id=p_related_action_id and profile_id=p_profile_id and type in ('warn','strike')) then raise exception 'Relación de multa inválida'; end if;
  insert into public.disciplinary_actions(profile_id,type,reason,issued_by,fine_amount,applies_to_week,related_action_id) values(p_profile_id,p_type,trim(p_reason),p_issued_by,p_fine_amount,p_applies_to_week,p_related_action_id) returning * into v_action;
  if p_type='warn' then
    select warns_per_strike into v_threshold from public.bonus_settings where id=true for share;
    select array_agg(id order by issued_at,id) into v_warn_ids from (select id,issued_at from public.disciplinary_actions where profile_id=p_profile_id and type='warn' and voided_at is null and converted_to_strike_id is null order by issued_at,id limit v_threshold for update) w;
    if coalesce(cardinality(v_warn_ids),0) >= v_threshold then
      v_trigger := v_warn_ids[cardinality(v_warn_ids)];
      insert into public.disciplinary_actions(profile_id,type,reason,issued_by,generated_from_warns,triggered_by_warn_id) values(p_profile_id,'strike','Conversión automática de warns.',p_issued_by,true,v_trigger) returning id into v_strike;
      update public.disciplinary_actions set converted_to_strike_id=v_strike where id=any(v_warn_ids);
    end if;
  end if;
  return query select v_action.id,v_strike,(select count(*)::integer from public.disciplinary_actions where profile_id=p_profile_id and type='strike' and voided_at is null);
end $$;

create function public.void_disciplinary_action(p_action_id uuid,p_voided_by uuid,p_void_reason text)
returns table(active_warn_count integer, active_strike_count integer) language plpgsql security definer set search_path = '' as $$
declare v_action public.disciplinary_actions%rowtype;
begin
  if not exists (select 1 from public.profiles where id=p_voided_by and active and role='admin') then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into v_action from public.disciplinary_actions where id=p_action_id; if not found then raise exception 'Sanción no encontrada' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_action.profile_id::text, 0));
  select * into v_action from public.disciplinary_actions where id=p_action_id for update; if v_action.voided_at is not null or length(trim(coalesce(p_void_reason,'')))=0 then raise exception 'Anulación inválida'; end if;
  if v_action.type='warn' and v_action.converted_to_strike_id is not null then raise exception 'Anula el strike generado para revertir esta conversión'; end if;
  if v_action.type='strike' and v_action.generated_from_warns then
    update public.disciplinary_actions set voided_at=now(),voided_by=p_voided_by,void_reason=trim(p_void_reason) where id=v_action.triggered_by_warn_id and voided_at is null;
    update public.disciplinary_actions set converted_to_strike_id=null where converted_to_strike_id=v_action.id and id<>v_action.triggered_by_warn_id and voided_at is null;
  end if;
  update public.disciplinary_actions set voided_at=now(),voided_by=p_voided_by,void_reason=trim(p_void_reason) where id=v_action.id;
  return query select (select count(*)::integer from public.disciplinary_actions where profile_id=v_action.profile_id and type='warn' and voided_at is null and converted_to_strike_id is null),(select count(*)::integer from public.disciplinary_actions where profile_id=v_action.profile_id and type='strike' and voided_at is null);
end $$;

create function public.save_bonus_settings(p_actor uuid,p_settings jsonb,p_tiers jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id=p_actor and active and role='admin') then raise exception 'Forbidden' using errcode='42501'; end if;
  perform 1 from public.bonus_settings where id=true for update;
  if coalesce((p_settings->>'peakWeight')::integer,0)+coalesce((p_settings->>'kitsWeight')::integer,0)+coalesce((p_settings->>'normalWeight')::integer,0)+coalesce((p_settings->>'consistencyWeight')::integer,0)<>100 then raise exception 'Los pesos deben sumar 100'; end if;
  if jsonb_typeof(p_tiers)<>'array' or jsonb_array_length(p_tiers)=0 then raise exception 'Tiers inválidos'; end if;
  update public.bonus_settings set weekly_goal_minutes=(p_settings->>'weeklyGoalMinutes')::integer,peak_start=(p_settings->>'peakStart')::time,peak_end=(p_settings->>'peakEnd')::time,active_day_minimum_minutes=(p_settings->>'activeDayMinimumMinutes')::integer,peak_target_minutes=(p_settings->>'peakTargetMinutes')::integer,normal_target_minutes=(p_settings->>'normalTargetMinutes')::integer,kits_target=(p_settings->>'kitsTarget')::integer,active_days_target=(p_settings->>'activeDaysTarget')::integer,peak_weight=(p_settings->>'peakWeight')::integer,kits_weight=(p_settings->>'kitsWeight')::integer,normal_weight=(p_settings->>'normalWeight')::integer,consistency_weight=(p_settings->>'consistencyWeight')::integer,inactivity_alert_days=(p_settings->>'inactivityAlertDays')::integer,warns_per_strike=(p_settings->>'warnsPerStrike')::integer,critical_strikes=(p_settings->>'criticalStrikes')::integer,updated_at=now(),updated_by=p_actor where id=true;
  delete from public.bonus_tiers;
  insert into public.bonus_tiers(position,min_score,max_score,amount) select position,min_score,max_score,amount from jsonb_to_recordset(p_tiers) as t(position integer,min_score integer,max_score integer,amount integer);
end $$;

create function public.finalize_bonus_run(p_run_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_run public.bonus_runs%rowtype;
begin
  if not exists (select 1 from public.profiles where id=p_actor and active and role='admin') then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into v_run from public.bonus_runs where id=p_run_id for update; if not found or v_run.status<>'draft' then raise exception 'Run no finalizable'; end if;
  perform 1 from public.bonus_results where run_id=p_run_id for update;
  if exists (select 1 from public.bonus_results where run_id=p_run_id and review_required and review_resolved_at is null) then raise exception 'Hay revisiones pendientes'; end if;
  update public.bonus_results set final_amount=coalesce(override_amount,recommended_final_amount) where run_id=p_run_id;
  update public.bonus_runs set status='finalized',finalized_by=p_actor,finalized_at=now() where id=p_run_id;
end $$;

revoke all on function public.record_disciplinary_action(uuid,public.disciplinary_action_type,text,uuid,integer,date,uuid) from public, anon, authenticated;
revoke all on function public.void_disciplinary_action(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.save_bonus_settings(uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.finalize_bonus_run(uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_disciplinary_action(uuid,public.disciplinary_action_type,text,uuid,integer,date,uuid),public.void_disciplinary_action(uuid,uuid,text),public.save_bonus_settings(uuid,jsonb,jsonb),public.finalize_bonus_run(uuid,uuid) to service_role;

commit;
