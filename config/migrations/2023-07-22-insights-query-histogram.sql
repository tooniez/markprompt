create or replace function get_insights_query_histogram(
  project_id uuid,
  from_tz timestamptz,
  to_tz timestamptz,
  tz text,
  trunc_interval text
)
returns table (
  date timestamp,
  occurrences bigint
)
language plpgsql
as $$
begin
  return query
  select date_trunc(trunc_interval, created_at at time zone tz) as date, count(*) as occurrences
  from query_stats
  where query_stats.project_id = get_insights_query_histogram.project_id
  and created_at >= from_tz
  and created_at <= to_tz
  group by date_trunc(trunc_interval, created_at at time zone tz);
end;
$$;