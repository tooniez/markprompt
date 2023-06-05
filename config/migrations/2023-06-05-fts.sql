create index ix_files_meta on files using pgroonga(meta);
create index ix_file_sections_meta on files using pgroonga(meta);

drop function full_text_search
create or replace function full_text_search(
  search_text text,
  match_count int,
  token text default null,
  public_api_key text default null,
  private_dev_api_key text default null
)
returns table (
  file_path text,
  file_meta jsonb,
  section_content text,
  section_meta jsonb,
  source_type source_type,
  source_data jsonb
)
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select
    v.file_path,
    v.file_meta,
    v.section_content,
    v.section_meta,
    v.source_type,
    v.source_data
  from v_file_section_search_infos as v
  where
    (
      v.section_content like '%' || search_text || '%'
      or v.file_meta &` ('paths @ ".title" && string @ "' || search_text || '"')
      or v.section_meta &` ('paths @ ".leadHeading.value" && string @ "' || search_text || '"')
    )
    and (
      v.token = full_text_search.token
      or v.public_api_key = full_text_search.public_api_key
      or v.private_dev_api_key = full_text_search.private_dev_api_key
    )
  limit match_count;
end;
$$;
