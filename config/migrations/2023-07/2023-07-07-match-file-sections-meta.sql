-- Add file meta in response for match_file_sections.
create or replace function match_file_sections(
  project_id uuid,
  embedding vector(1536),
  match_threshold float,
  match_count int,
  min_content_length int)
returns table (
  files_path text,
  files_meta jsonb,
  file_sections_content text,
  file_sections_meta jsonb,
  file_sections_token_count int,
  file_sections_similarity float,
  source_type source_type,
  source_data jsonb
)
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select
    f.path as files_path,
    f.meta as files_meta,
    fs.content as file_sections_content,
    fs.meta as file_sections_meta,
    fs.token_count as file_sections_token_count,
    (fs.embedding <#> embedding) * -1 as file_sections_similarity,
    s.type as source_type,
    s.data as source_data
  from file_sections fs
  join files f on fs.file_id = f.id
  join sources s on f.source_id = s.id
  where s.project_id = project_id
  -- We only care about sections that have a useful amount of content
  and length(fs.content) >= min_content_length
  -- The dot product is negative because of a Postgres limitation,
  -- so we negate it
  and (fs.embedding <#> embedding) * -1 > match_threshold
  -- OpenAI embeddings are normalized to length 1, so
  -- cosine similarity and dot product will produce the same results.
  -- Using dot product which can be computed slightly faster.
  -- For the different syntaxes, see https://github.com/pgvector/pgvector
  order by fs.embedding <#> embedding
  limit match_count;
end;
$$;