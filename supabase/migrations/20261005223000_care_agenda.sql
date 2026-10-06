begin;

-- =============================================================================
-- PAZO — Fase 9A
-- Agenda/Cuidados: persistencia, historial, recurrencia y operaciones atómicas
-- Preparada para revisión. NO aplicada a Supabase desde esta rama.
-- =============================================================================

create table public.care_items (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id),
  title text not null,
  category text not null,
  due_date date not null,
  due_time time without time zone,
  timezone text not null,
  recurrence text not null default 'none',
  reminder_days_before smallint,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint care_items_title_length
    check (char_length(btrim(title)) between 2 and 120),
  constraint care_items_category_valid
    check (category in ('veterinarian','vaccine','medication','hygiene','feeding','other')),
  constraint care_items_recurrence_valid
    check (recurrence in ('none','daily','weekly','monthly','yearly')),
  constraint care_items_reminder_valid
    check (reminder_days_before is null or reminder_days_before in (0,1,2,7)),
  constraint care_items_notes_length
    check (notes is null or char_length(notes) <= 1000),
  constraint care_items_status_valid
    check (status in ('active','completed','archived')),
  constraint care_items_timezone_not_blank
    check (char_length(btrim(timezone)) between 1 and 100)
);

create table public.care_completions (
  id uuid primary key default gen_random_uuid(),
  care_item_id uuid not null references public.care_items(id),
  pet_id uuid not null references public.pets(id),
  scheduled_date date not null,
  scheduled_time time without time zone,
  completed_at timestamptz not null default now(),
  title_snapshot text not null,
  category_snapshot text not null,
  notes_snapshot text,
  recurrence_snapshot text not null,
  created_at timestamptz not null default now(),

  constraint care_completions_title_length
    check (char_length(btrim(title_snapshot)) between 2 and 120),
  constraint care_completions_category_valid
    check (category_snapshot in ('veterinarian','vaccine','medication','hygiene','feeding','other')),
  constraint care_completions_recurrence_valid
    check (recurrence_snapshot in ('none','daily','weekly','monthly','yearly')),
  constraint care_completions_notes_length
    check (notes_snapshot is null or char_length(notes_snapshot) <= 1000)
);

create index idx_care_items_pet_status_due
  on public.care_items (pet_id, status, due_date, due_time);

create index idx_care_completions_item_completed
  on public.care_completions (care_item_id, completed_at desc);

create index idx_care_completions_pet_completed
  on public.care_completions (pet_id, completed_at desc);

create unique index uq_care_completion_occurrence
  on public.care_completions (
    care_item_id,
    scheduled_date,
    coalesce(scheduled_time, '00:00:00'::time)
  );

alter table public.care_items enable row level security;
alter table public.care_completions enable row level security;

-- -----------------------------------------------------------------------------
-- Normalización/validación interna
-- -----------------------------------------------------------------------------

create or replace function private.prepare_care_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.title := btrim(new.title);
  new.timezone := btrim(new.timezone);
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = new.timezone
  ) then
    raise exception 'Zona horaria inválida.';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$function$;

revoke all on function private.prepare_care_item() from public;

create trigger trg_prepare_care_item
before insert or update on public.care_items
for each row execute function private.prepare_care_item();

create or replace function private.next_care_due_date(
  p_base_date date,
  p_recurrence text
)
returns date
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_target_month_start date;
  v_target_month_last date;
  v_target_year integer;
  v_target_month integer;
  v_target_day integer;
  v_target_year_month_last date;
begin
  case p_recurrence
    when 'daily' then
      return p_base_date + 1;
    when 'weekly' then
      return p_base_date + 7;
    when 'monthly' then
      v_target_month_start :=
        (date_trunc('month', p_base_date::timestamp) + interval '1 month')::date;
      v_target_month_last :=
        (date_trunc('month', v_target_month_start::timestamp)
          + interval '1 month'
          - interval '1 day')::date;

      return least(
        v_target_month_start + (extract(day from p_base_date)::integer - 1),
        v_target_month_last
      );
    when 'yearly' then
      v_target_year := extract(year from p_base_date)::integer + 1;
      v_target_month := extract(month from p_base_date)::integer;
      v_target_day := extract(day from p_base_date)::integer;
      v_target_year_month_last :=
        (make_date(v_target_year, v_target_month, 1)
          + interval '1 month'
          - interval '1 day')::date;

      return make_date(
        v_target_year,
        v_target_month,
        least(v_target_day, extract(day from v_target_year_month_last)::integer)
      );
    else
      raise exception 'Recurrencia no soportada.';
  end case;
end;
$function$;

revoke all on function private.next_care_due_date(date, text) from public;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

create policy care_items_owner_select
on public.care_items
for select
to authenticated
using (
  pet_id in (
    select p.id
    from public.pets p
    where p.owner_id = (select auth.uid())
  )
);

create policy care_items_owner_insert
on public.care_items
for insert
to authenticated
with check (
  status = 'active'
  and pet_id in (
    select p.id
    from public.pets p
    where p.owner_id = (select auth.uid())
  )
);

create policy care_items_owner_update
on public.care_items
for update
to authenticated
using (
  status = 'active'
  and pet_id in (
    select p.id
    from public.pets p
    where p.owner_id = (select auth.uid())
  )
)
with check (
  status = 'active'
  and pet_id in (
    select p.id
    from public.pets p
    where p.owner_id = (select auth.uid())
  )
);

create policy care_completions_owner_select
on public.care_completions
for select
to authenticated
using (
  pet_id in (
    select p.id
    from public.pets p
    where p.owner_id = (select auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- Grants mínimos
-- -----------------------------------------------------------------------------

revoke all on table public.care_items from anon, authenticated;
revoke all on table public.care_completions from anon, authenticated;

grant select on table public.care_items to authenticated;
grant insert (
  pet_id,
  title,
  category,
  due_date,
  due_time,
  timezone,
  recurrence,
  reminder_days_before,
  notes
) on public.care_items to authenticated;
grant update (
  title,
  category,
  due_date,
  due_time,
  timezone,
  recurrence,
  reminder_days_before,
  notes
) on public.care_items to authenticated;

grant select on table public.care_completions to authenticated;

grant all on table public.care_items to service_role;
grant all on table public.care_completions to service_role;

-- -----------------------------------------------------------------------------
-- Completar cuidado de forma atómica
-- -----------------------------------------------------------------------------

create or replace function public.complete_care_item(
  p_care_item_id uuid,
  p_expected_due_date date,
  p_expected_due_time time without time zone default null
)
returns table (
  completion_id uuid,
  care_item_id uuid,
  care_status text,
  next_due_date date,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item public.care_items%rowtype;
  v_completion_id uuid;
  v_completed_at timestamptz := clock_timestamp();
  v_local_completion_date date;
  v_next_due_date date;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticación requerida.';
  end if;

  select ci.*
  into v_item
  from public.care_items ci
  join public.pets p on p.id = ci.pet_id
  where ci.id = p_care_item_id
    and p.owner_id = (select auth.uid())
  for update of ci;

  if not found then
    raise exception 'Cuidado no encontrado o sin acceso.';
  end if;

  if v_item.status <> 'active' then
    raise exception 'El cuidado ya no está activo.';
  end if;

  if v_item.due_date <> p_expected_due_date
     or v_item.due_time is distinct from p_expected_due_time then
    raise exception 'El cuidado cambió. Actualiza la Agenda e inténtalo de nuevo.';
  end if;

  insert into public.care_completions (
    care_item_id,
    pet_id,
    scheduled_date,
    scheduled_time,
    completed_at,
    title_snapshot,
    category_snapshot,
    notes_snapshot,
    recurrence_snapshot
  )
  values (
    v_item.id,
    v_item.pet_id,
    v_item.due_date,
    v_item.due_time,
    v_completed_at,
    v_item.title,
    v_item.category,
    v_item.notes,
    v_item.recurrence
  )
  returning id into v_completion_id;

  if v_item.recurrence = 'none' then
    update public.care_items
    set status = 'completed',
        updated_at = now()
    where id = v_item.id;

    v_next_due_date := null;
  else
    v_local_completion_date :=
      (v_completed_at at time zone v_item.timezone)::date;

    v_next_due_date :=
      private.next_care_due_date(v_local_completion_date, v_item.recurrence);

    update public.care_items
    set due_date = v_next_due_date,
        updated_at = now()
    where id = v_item.id;
  end if;

  return query
  select
    v_completion_id,
    v_item.id,
    case when v_item.recurrence = 'none' then 'completed' else 'active' end::text,
    v_next_due_date,
    v_completed_at;
end;
$function$;

revoke all on function public.complete_care_item(uuid, date, time without time zone)
from public, anon;

grant execute on function public.complete_care_item(uuid, date, time without time zone)
to authenticated;

-- -----------------------------------------------------------------------------
-- Deshacer únicamente la completion más reciente del cuidado
-- -----------------------------------------------------------------------------

create or replace function public.undo_care_completion(
  p_completion_id uuid
)
returns table (
  care_item_id uuid,
  restored_due_date date,
  restored_due_time time without time zone,
  care_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_completion public.care_completions%rowtype;
  v_item public.care_items%rowtype;
  v_latest_completion_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticación requerida.';
  end if;

  select cc.*
  into v_completion
  from public.care_completions cc
  join public.pets p on p.id = cc.pet_id
  where cc.id = p_completion_id
    and p.owner_id = (select auth.uid());

  if not found then
    raise exception 'Registro de historial no encontrado o sin acceso.';
  end if;

  select ci.*
  into v_item
  from public.care_items ci
  where ci.id = v_completion.care_item_id
  for update;

  if not found then
    raise exception 'Cuidado relacionado no encontrado.';
  end if;

  select cc.id
  into v_latest_completion_id
  from public.care_completions cc
  where cc.care_item_id = v_item.id
  order by cc.completed_at desc, cc.id desc
  limit 1;

  if v_latest_completion_id is distinct from v_completion.id then
    raise exception 'Solo puede deshacerse la realización más reciente.';
  end if;

  update public.care_items
  set status = 'active',
      due_date = v_completion.scheduled_date,
      due_time = v_completion.scheduled_time,
      updated_at = now()
  where id = v_item.id;

  delete from public.care_completions
  where id = v_completion.id;

  return query
  select
    v_item.id,
    v_completion.scheduled_date,
    v_completion.scheduled_time,
    'active'::text;
end;
$function$;

revoke all on function public.undo_care_completion(uuid)
from public, anon;

grant execute on function public.undo_care_completion(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Archivar cuidado activo (producto: "Eliminar")
-- -----------------------------------------------------------------------------

create or replace function public.archive_care_item(
  p_care_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticación requerida.';
  end if;

  update public.care_items ci
  set status = 'archived',
      updated_at = now()
  where ci.id = p_care_item_id
    and ci.status = 'active'
    and exists (
      select 1
      from public.pets p
      where p.id = ci.pet_id
        and p.owner_id = (select auth.uid())
    );

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Cuidado no encontrado, no activo o sin acceso.';
  end if;

  return true;
end;
$function$;

revoke all on function public.archive_care_item(uuid)
from public, anon;

grant execute on function public.archive_care_item(uuid)
to authenticated;

commit;
