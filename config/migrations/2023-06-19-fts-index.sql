create or replace function create_fts_index()
returns void
language plpgsql
security definer
as $$
begin
  create index idx_file_sections_fts
  on mv_fts
  using pgroonga ((array[
      section_content,
      (file_meta->>'title')::text,
      (section_meta->'leadHeading'->>'value')::text
    ]));
end;
$$;