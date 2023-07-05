
-- Pgroonga index on file_sections content
create index idx_pgroonga_file_sections_content on file_sections using pgroonga (content);
-- Pgroonga index on files meta
create index idx_pgroonga_files_meta on files using pgroonga (meta);
create index idx_pgroonga_files_meta_title on files using pgroonga ((meta->>'title'));

create or replace function fts_file_section_content(
  search_term text,
  match_count int,
  project_id uuid
)
returns table (
  id bigint,
  content text,
  meta jsonb,
  file_id bigint
)
language plpgsql
as $$
begin
  return query
  select
    fs.id,
    fs.content,
    fs.meta,
    fs.file_id as file_id
  from file_sections fs
  where
    fs.cf_project_id = fts_file_section_content.project_id
    and fs.content ilike '%' || fts_file_section_content.search_term || '%'
  limit fts_file_section_content.match_count;
end;
$$;

create or replace function fts_file_title(
  search_term text,
  match_count int,
  project_id uuid
)
returns table (
  id bigint
)
language plpgsql
as $$
begin
  return query
  select f.id
  from files f
  where
    f.project_id = fts_file_title.project_id
    and f.meta->>'title' &@ fts_file_title.search_term
  limit fts_file_title.match_count;
end;
$$;
