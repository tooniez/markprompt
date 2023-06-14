create view v_distinct_unprocessed_query_stats_project_ids as
  select project_id, min(created_at) as min_created_at
  from query_stats
  where processed = false
  group by project_id
  order by min_created_at asc;

-- Add reference paths to each query stats
alter table query_stats
add column reference_paths text[];

create index idx_query_stats_project_id_created_at_processed on query_stats(project_id, created_at, processed);

-- Query top references
create or replace function query_stats_top_references(
  project_id uuid,
  from_tz timestamptz,
  to_tz timestamptz,
  match_count int
)
returns table (
  path text,
  occurrences bigint
)
language plpgsql
as $$
begin
  return query
  select unnest(reference_paths) as path, count(*) as occurrences
  from query_stats
  where
    query_stats.project_id = query_stats_top_references.project_id
    and query_stats.created_at >= query_stats_top_references.from_tz
    and query_stats.created_at <= query_stats_top_references.to_tz
  group by path
  order by occurrences desc
  limit query_stats_top_references.match_count;
end;
$$;