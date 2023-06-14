
drop view v_team_project_usage_info;
create view v_team_project_usage_info as
  select
    projects.id as project_id,
    teams.id as team_id,
    teams.is_enterprise_plan as is_enterprise_plan,
    teams.stripe_price_id as stripe_price_id,
    teams.plan_details as plan_details,
    sum(file_sections.token_count) as team_token_count
  from file_sections
  left join files on file_sections.file_id = files.id
  left join sources on files.source_id = sources.id
  left join projects on sources.project_id = projects.id
  left join teams on projects.team_id = teams.id
  group by projects.id, teams.id;

  drop view v_team_project_info;
  create view v_team_project_info as
  select
    projects.id as project_id,
    teams.id as team_id,
    teams.is_enterprise_plan as is_enterprise_plan,
    teams.stripe_price_id as stripe_price_id,
    teams.plan_details as plan_details
  from projects
  left join teams on projects.team_id = teams.id;