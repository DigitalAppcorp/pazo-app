create table public.search_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_type text not null,
  result_type text,
  filter_type text,
  had_results boolean,
  created_at timestamptz not null default now(),

  constraint search_usage_event_type_valid
    check (
      event_type in (
        'search_open',
        'search_execute',
        'search_result_open',
        'search_filter_change'
      )
    ),

  constraint search_usage_result_type_valid
    check (
      result_type is null
      or result_type in ('pet', 'community', 'place')
    ),

  constraint search_usage_filter_type_valid
    check (
      filter_type is null
      or filter_type in ('all', 'pet', 'community', 'place')
    ),

  constraint search_usage_event_shape_valid
    check (
      (
        event_type = 'search_open'
        and result_type is null
        and filter_type is null
        and had_results is null
      )
      or
      (
        event_type = 'search_execute'
        and result_type is null
        and filter_type is null
        and had_results is not null
      )
      or
      (
        event_type = 'search_result_open'
        and result_type is not null
        and filter_type is not null
        and had_results is null
      )
      or
      (
        event_type = 'search_filter_change'
        and result_type is null
        and filter_type is not null
        and had_results is null
      )
    )
);

alter table public.search_usage_events enable row level security;

revoke all on table public.search_usage_events
  from public, anon, authenticated;

grant insert (
  session_id,
  event_type,
  result_type,
  filter_type,
  had_results
) on table public.search_usage_events
  to authenticated;

grant all on table public.search_usage_events
  to service_role;

create policy search_usage_events_insert_own
on public.search_usage_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);
