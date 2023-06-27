-- Remove the is_enterprise_plan column from the teams table

drop view v_file_section_search_infos;
create view v_file_section_search_infos as
  select
    f.id as file_id,
    f.path as file_path,
    f.meta as file_meta,
    fs.content as section_content,
    fs.meta as section_meta,
    s.type as source_type,
    s.data as source_data,
    p.id as project_id,
    p.public_api_key as public_api_key,
    p.private_dev_api_key as private_dev_api_key,
    tok.value as token,
    d.name as domain,
    t.stripe_price_id as stripe_price_id
  from file_sections fs
  left join files f on fs.file_id = f.id
  left join sources s on f.source_id = s.id
  left join projects p on s.project_id = p.id
  left join tokens tok on p.id = tok.project_id
  left join domains d on p.id = d.project_id
  left join teams t on t.id = p.team_id;

drop view v_team_project_info;
create view v_team_project_info as
  select
    projects.id as project_id,
    teams.id as team_id,
    teams.stripe_price_id as stripe_price_id,
    teams.plan_details as plan_details
  from projects
  left join teams on projects.team_id = teams.id;

drop view v_team_project_usage_info;
create view v_team_project_usage_info as
  select
    projects.id as project_id,
    teams.id as team_id,
    teams.stripe_price_id as stripe_price_id,
    teams.plan_details as plan_details,
    sum(file_sections.token_count) as team_token_count
  from file_sections
  left join files on file_sections.file_id = files.id
  left join sources on files.source_id = sources.id
  left join projects on sources.project_id = projects.id
  left join teams on projects.team_id = teams.id
  group by projects.id, teams.id;


alter table teams
drop column is_enterprise_plan;