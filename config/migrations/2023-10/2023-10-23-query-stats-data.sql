create index idx_projects_id on projects(id);

alter table query_stats
add column data jsonb;

create table public.query_stats_usage (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  team_id       uuid references public.teams on delete cascade not null,
  query_stat_id uuid references public.query_stats,
  data          jsonb
);
comment on table public.query_stats_usage is 'Usage.';

alter table query_stats_usage
  enable row level security;

create policy "Users can only see query stats usage associated to teams they are members of." on public.query_stats_usage
  for select using (
    exists (
      select 1 from memberships
      where memberships.user_id = auth.uid()
      and memberships.team_id = query_stats_usage.team_id
    )
  );

create policy "Users can delete query stats usage associated to teams they are members of." on public.query_stats_usage
  for delete using (
    exists (
      select 1 from memberships
      where memberships.user_id = auth.uid()
      and memberships.team_id = query_stats_usage.team_id
    )
  );
