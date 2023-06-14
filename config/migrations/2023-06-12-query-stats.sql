create view v_distinct_unprocessed_query_stats_project_ids as
  select project_id, min(created_at) as min_created_at
  from query_stats
  where processed = false
  group by project_id
  order by min_created_at asc;

-- Add reference paths to each query stats
alter table query_stats
add column reference_paths text[];

alter table query_stats
add column meta jsonb;

-- Add source info to response
drop function match_file_sections;
create or replace function match_file_sections(
  project_id uuid,
  embedding vector(1536),
  match_threshold float,
  match_count int,
  min_content_length int)
returns table (
  path text,
  content text,
  token_count int,
  similarity float,
  source_type source_type,
  source_data jsonb
)
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select
    files.path,
    file_sections.content,
    file_sections.token_count,
    (file_sections.embedding <#> embedding) * -1 as similarity,
    sources.type as source_type,
    sources.data as source_data
  from file_sections
  join files on file_sections.file_id = files.id
  join sources on files.source_id = sources.id
  where sources.project_id = project_id
  -- We only care about sections that have a useful amount of content
  and length(file_sections.content) >= min_content_length
  -- The dot product is negative because of a Postgres limitation,
  -- so we negate it
  and (file_sections.embedding <#> embedding) * -1 > match_threshold
  -- OpenAI embeddings are normalized to length 1, so
  -- cosine similarity and dot product will produce the same results.
  -- Using dot product which can be computed slightly faster.
  -- For the different syntaxes, see https://github.com/pgvector/pgvector
  order by file_sections.embedding <#> embedding
  limit match_count;
end;
$$;
