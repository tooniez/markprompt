create index idx_query_stats_usage_team_id_created on query_stats_usage(team_id, created_at);

alter table query_stats_usage
add column normalized_token_count int;
