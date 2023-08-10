alter table files
add column raw_content text;

alter table files
add column token_count int;

create or replace function is_project_accessible_to_user(
  user_id uuid,
  project_id uuid
)
returns table (
  has_access boolean
)
language plpgsql
as $$
begin
  return query
  select
    case when exists (
      select 1
      from projects p
      inner join teams t on p.team_id = t.id
      inner join memberships m on t.id = m.team_id
      where p.id = is_project_accessible_to_user.project_id
      and m.user_id = is_project_accessible_to_user.user_id
    ) then true else false end as has_access;
end;
$$;