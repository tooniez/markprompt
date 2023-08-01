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
  to_tz timestamptz
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

create or replace function get_project_query_stats(
  project_id uuid,
  from_tz timestamptz,
  to_tz timestamptz
)
returns table (
  num_queries bigint,
  num_unanswered bigint,
  num_upvotes bigint,
  num_downvotes bigint
)
language plpgsql
as $$
begin
  return query
  select
    count(distinct qs.id) as num_queries,
    count(case when
        qs.no_response = true
        and qs.prompt is not null
        and qs.prompt <> ''
        then qs.id
      end
    ) as num_unanswered,
    count(distinct case when qs.feedback ->> 'vote' = '1' then qs.id end) as num_upvotes,
    count(distinct case when qs.feedback ->> 'vote' = '-1' then qs.id end) as num_downvotes
  from
    projects p
  left join query_stats qs on p.id = qs.project_id
  where
    p.id = get_project_query_stats.project_id
    and qs.created_at >= from_tz
    and qs.created_at <= to_tz
    and (
      qs.processed_state = 'processed'
      or qs.processed_state = 'skipped'
    )
  group by p.name, p.slug;
end;
$$;

create or replace function get_most_cited_references_stats(
  project_id uuid,
  from_tz timestamptz,
  to_tz timestamptz,
  max_results int
)
returns table (
  full_path text,
  path text,
  slug text,
  title text,
  heading text,
  occurrences bigint
)
language plpgsql
as $$
begin
  return query
  with subquery as (
    select
      jsonb_array_elements(meta->'references') as expanded_json
    from
      query_stats qs
    where
      qs.project_id = get_most_cited_references_stats.project_id
      and qs.created_at >= from_tz
      and qs.created_at <= to_tz
  )
  select
    (jsonb_path_query(expanded_json, '$.file.path') #>> '{}') || '#' ||
      (jsonb_path_query(expanded_json, '$.meta.leadHeading.slug') #>> '{}') as full_path,
    jsonb_path_query(expanded_json::jsonb, '$.file.path') #>> '{}' as path,
    jsonb_path_query(expanded_json, '$.meta.leadHeading.slug') #>> '{}' as slug,
    jsonb_path_query(expanded_json, '$.file.title') #>> '{}' as title,
    jsonb_path_query(expanded_json, '$.meta.leadHeading.value') #>> '{}' as heading,
    count(*) as occurrences
  from
    subquery
  group by full_path, expanded_json
  order by occurrences desc
  limit get_most_cited_references_stats.max_results;
end;
$$;

create or replace function get_project_file_stats(
  project_id uuid
)
returns table (
  num_files bigint,
  num_sections bigint,
  num_tokens bigint
)
language plpgsql
as $$
begin
  return query
  select
    count(distinct f.id) as num_files,
    count(fs.id) as num_sections,
    sum(fs.token_count) as num_tokens
  from file_sections fs
  join files f on f.id = fs.file_id
  join sources s on s.id = f.source_id
  where s.project_id = get_project_file_stats.project_id;
end;
$$;

-- Views

-- Since a weekly update email sets the `lastWeeklyUpdateEmail` field
-- to the beginning of the past week, we should look for entries
-- where lastWeeklyUpdateEmail is older than 2 weeks.
create view v_users_with_pending_weekly_update_email as
select id,email,config
from users
where config is null
or (
  (
    config->>'sendWeeklyUpdates' = 'true'
    or not jsonb_exists(config, 'sendWeeklyUpdates')
  )
  and
  (
    not jsonb_exists(config, 'lastWeeklyUpdateEmail')
    or (config->>'lastWeeklyUpdateEmail')::timestamptz <= now() - INTERVAL '2 weeks'
  )
);
