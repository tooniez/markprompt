alter table users
add column config jsonb;

create or replace function get_team_stats(
  team_id uuid
)
returns table (
  project_id uuid,
  project_name text,
  project_slug text,
  num_files bigint,
  num_file_sections bigint,
  num_tokens bigint
)
language plpgsql
as $$
begin
  return query
  select
    projects.id as project_id,
    projects.name as project_name,
    projects.slug as project_slug,
    count(distinct files.id) as num_files,
    count(distinct file_sections.id) as num_file_sections,
    sum(file_sections.token_count) as num_tokens
  from projects
  join sources on projects.id = sources.project_id
  join files on sources.id = files.source_id
  join file_sections on files.id = file_sections.file_id
  where projects.team_id = get_team_stats.team_id
  group by projects.id;
end;
$$;

create or replace function get_team_insights_query_histogram(
  team_id uuid,
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
  join projects on projects.id = query_stats.project_id
  where projects.team_id = get_team_insights_query_histogram.team_id
  and created_at >= from_tz
  and created_at <= to_tz
  group by date_trunc(trunc_interval, created_at at time zone tz);
end;
$$;

create or replace function get_team_num_completions(
  team_id uuid,
  from_tz timestamptz,
  to_tz timestamptz,
  tz text
)
returns table (
  occurrences bigint
)
language plpgsql
as $$
begin
  return query
  select count(*) as occurrences
  from query_stats
  join projects on projects.id = query_stats.project_id
  where projects.team_id = get_team_num_completions.team_id
  and created_at >= from_tz
  and created_at <= to_tz;
end;
$$;