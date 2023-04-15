-- This migration introduces a new "sources" table, and migrates
-- projects with a non-empty "github_repo" column to entries in
-- the "sources" table.

-- Sources
create table public.sources (
  id          uuid primary key default uuid_generate_v4(),
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id  uuid references public.projects on delete cascade not null,
  source      text not null,
  data        jsonb
);
comment on table public.sources is 'Data sources for a project.';

-- RLS

alter table sources
  enable row level security;

create policy "Users can only see sources associated to projects they have access to." on public.sources
  for select using (
    sources.project_id in (
      select projects.id from projects
      left join memberships
      on projects.team_id = memberships.team_id
      where memberships.user_id = auth.uid()
    )
  );

create policy "Users can insert sources associated to projects they have access to." on public.sources
  for insert with check (
    sources.project_id in (
      select projects.id from projects
      left join memberships
      on projects.team_id = memberships.team_id
      where memberships.user_id = auth.uid()
    )
  );

create policy "Users can update sources associated to projects they have access to." on public.sources
  for update using (
    sources.project_id in (
      select projects.id from projects
      left join memberships
      on projects.team_id = memberships.team_id
      where memberships.user_id = auth.uid()
    )
  );

create policy "Users can delete sources associated to projects they have access to." on public.sources
  for delete using (
    sources.project_id in (
      select projects.id from projects
      left join memberships
      on projects.team_id = memberships.team_id
      where memberships.user_id = auth.uid()
    )
  );

-- Migration from the "github_repo" project column to sources entry.

insert into sources (project_id, data)
select id, jsonb_build_object('github', github_repo)
from projects
where github_repo is not null and github_repo <> ''
and not exists (
  select 1 from sources where sources.project_id = projects.id
);