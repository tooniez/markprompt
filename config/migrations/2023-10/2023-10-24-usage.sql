create index idx_query_stats_usage_team_id_created on query_stats_usage(team_id, created_at);

alter table query_stats_usage
add column normalized_token_count int;

-- Count credits

create or replace function count_team_credits(
  team_id uuid,
  from_tz timestamptz,
  to_tz timestamptz
)
returns table (
  count bigint
)
language plpgsql
as $$
begin
  return query
  select sum(ceil(normalized_token_count::decimal / 1000)::integer) as count
  from query_stats_usage as qsu
  where qsu.team_id = count_team_credits.team_id
    and qsu.created_at >= count_team_credits.from_tz
    and qsu.created_at <= count_team_credits.to_tz
  group by qsu.team_id;
end;
$$;

-- Count credits per completions model

create or replace function count_team_credits_for_completions_model(
  team_id uuid,
  from_tz timestamptz,
  to_tz timestamptz,
  model text
)
returns table (
  count bigint
)
language plpgsql
as $$
begin
  return query
  select sum(ceil(normalized_token_count::decimal / 1000)::integer) as count
  from query_stats_usage as qsu
  where qsu.team_id = count_team_credits_for_completions_model.team_id
    and qsu.created_at >= count_team_credits_for_completions_model.from_tz
    and qsu.created_at <= count_team_credits_for_completions_model.to_tz
    and qsu.data->'completion'->>'model' = count_team_credits_for_completions_model.model
  group by qsu.team_id;
end;
$$;
