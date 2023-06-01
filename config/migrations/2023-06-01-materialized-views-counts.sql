drop materialized view team_project_usage_info
refresh materialized view team_project_usage_info;

create or replace function refresh_materialized_view(view_name text)
returns void as $$
begin
  refresh materialized view view_name;
end;
$$ language plpgsql;

create view v_team_project_usage_info as
  select
    projects.id as project_id,
    teams.id as team_id,
    teams.is_enterprise_plan as is_enterprise_plan,
    teams.stripe_price_id as stripe_price_id,
    sum(file_sections.token_count) as team_token_count
  from file_sections
  left join files on file_sections.file_id = files.id
  left join sources on files.source_id = sources.id
  left join projects on sources.project_id = projects.id
  left join teams on projects.team_id = teams.id
  group by projects.id, teams.id

-- create materialized view project_ids_with_team_token_counts as
--   select
--     teams.id as team_id,
--     projects.id as project_id,
--     sum(file_sections.token_count) as team_token_count
--   from file_sections
--   join files on file_sections.file_id = files.id
--   join sources on files.source_id = sources.id
--   join projects on sources.project_id = projects.id
--   join teams on projects.team_id = teams.id
--   group by teams.id, projects.id;

-- create materialized view files_with_token_count_project_id as
--   select files.*, sum(file_sections.token_count) as token_count
--   from file_sections
--   join files on file_sections.file_id = files.id
--   join sources on files.source_id = sources.id
--   join projects on sources.project_id = projects.id
--   group by files.id