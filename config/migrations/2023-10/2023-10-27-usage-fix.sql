-- Clear query stat id
create or replace function clear_query_stat_id_from_query_stats_usage()
returns trigger
language plpgsql
as $$
begin
  update query_stats_usage
  set query_stat_id = null
  where query_stat_id = old.id;
  return old;
end;
$$;

-- Clear query_stat_id from query_stats_usage when a query_stat is deleted
create trigger trigger_clear_query_stat_usage_query_stat_id_on_query_stat_delete
  before delete on public.query_stats
  for each row
  execute function clear_query_stat_id_from_query_stats_usage();
