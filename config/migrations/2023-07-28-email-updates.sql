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