create index search_usage_events_user_created_idx
  on public.search_usage_events (user_id, created_at desc);
