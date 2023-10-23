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

-- MIGRATION-START -------------------------------------

drop view v_insights_query_stats;

-- MIGRATION-END ---------------------------------------

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

-- MIGRATION-START -------------------------------------

create view v_insights_query_stats as
  select
    qs.id as id,
    qs.conversation_id as conversation_id,
    qs.created_at as created_at,
    qs.project_id as project_id,
    qs.processed_state as processed_state,
    qs.decrypted_prompt as decrypted_prompt,
    qs.no_response as no_response,
    qs.feedback as feedback,
    c.decrypted_metadata::jsonb as decrypted_conversation_metadata
  from decrypted_query_stats qs
  left join decrypted_conversations c on qs.conversation_id = c.id

-- MIGRATION-END ---------------------------------------
