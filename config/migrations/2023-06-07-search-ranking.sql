-- create index idx_files_meta on files using pgroonga(meta);
-- create index idx_file_sections_meta on files using pgroonga(meta);
create index idx_tokens_project_id on tokens(project_id);
create index idx_domain_project_id on domains(project_id);
create unique index idx_section_id_fts on mv_fts (section_id);
create index idx_file_sections_fts
on mv_fts
using pgroonga ((array[
    section_content,
    (file_meta->>'title')::text,
    (section_meta->'leadHeading'->>'value')::text
  ]));

create materialized view mv_fts as
  select
    f.id as file_id,
    f.path as file_path,
    f.meta as file_meta,
    fs.id as section_id,
    fs.content as section_content,
    fs.meta as section_meta,
    s.type as source_type,
    s.data as source_data,
    p.id as project_id,
    p.public_api_key as public_api_key,
    p.private_dev_api_key as private_dev_api_key,
    tok.value as token,
    d.name as domain,
    t.stripe_price_id as stripe_price_id,
    t.is_enterprise_plan as is_enterprise_plan
  from file_sections fs
  left join files f on fs.file_id = f.id
  left join sources s on f.source_id = s.id
  left join projects p on s.project_id = p.id
  left join tokens tok on p.id = tok.project_id
  left join domains d on p.id = d.project_id
  left join teams t on t.id = p.team_id

-- Make sure security defined is set, cf.
-- https://stackoverflow.com/questions/67530999/error-must-be-owner-of-materialized-view-postgresql
create or replace function refresh_materialized_view(view_name text)
returns void
security definer
as $$
begin
  execute 'refresh materialized view concurrently ' || view_name;
end;
$$ language plpgsql;

create or replace function full_text_search(
  search_term text,
  match_count int,
  token_param text default null,
  public_api_key_param text default null,
  private_dev_api_key_param text default null
)
returns table (
  file_id bigint,
  file_path text,
  file_meta jsonb,
  section_id bigint,
  section_content text,
  section_meta jsonb,
  source_type source_type,
  source_data jsonb,
  project_id uuid,
  public_api_key text,
  private_dev_api_key text,
  token text,
  domain text,
  stripe_price_id text,
  is_enterprise boolean,
  score double precision
)
language plpgsql
as $$
begin
  return query
  select
    *, pgroonga_score(mv_fts.tableoid, mv_fts.ctid) as score
  from mv_fts
  where
    (
      array[
        mv_fts.section_content,
        (mv_fts.file_meta->>'title')::text,
        (mv_fts.section_meta->'leadHeading'->>'value')::text
      ] &@ (full_text_search.search_term, array[1, 100, 10], 'idx_file_sections_fts')::pgroonga_full_text_search_condition
    )
    and (
      mv_fts.token = full_text_search.token_param
      or mv_fts.public_api_key = full_text_search.public_api_key_param
      or mv_fts.private_dev_api_key = full_text_search.private_dev_api_key_param
    )
  limit match_count;
end;
$$;

-- create or replace function full_text_search(
--   search_term text,
--   match_count int,
--   token text default null,
--   public_api_key text default null,
--   private_dev_api_key text default null
-- )
-- returns table (
--   file_id bigint,
--   file_path text,
--   file_meta jsonb,
--   section_content text,
--   section_meta jsonb,
--   source_type source_type,
--   source_data jsonb,
--   score double precision
-- )
-- language plpgsql
-- as $$
-- #variable_conflict use_variable
-- begin
--   return query
--   select
--     file_id,
--     file_path,
--     file_meta,
--     section_content,
--     section_meta,
--     source_type,
--     source_data,
--     pgroonga_score(mv_fts.tableoid, mv_fts.ctid) as score
--   from mv_fts
--   where
--     (
--       array[
--         mv_fts.section_content,
--         (mv_fts.file_meta->>'title')::text,
--         (mv_fts.section_meta->'leadHeading'->>'value')::text
--       ] &@ (full_text_search.search_term, array[1, 100, 10], 'idx_file_sections_fts')::pgroonga_full_text_search_condition
--     )
--     and (
--       mv_fts.token = full_text_search.token
--       or mv_fts.public_api_key = full_text_search.public_api_key
--       or mv_fts.private_dev_api_key = full_text_search.private_dev_api_key
--     )
--   order by score desc
--   limit match_count;
-- end;
-- $$;

-- language plpgsql
-- as $$
-- #variable_conflict use_variable
-- begin
--   return query
--   select
--     v.file_id,
--     v.file_path,
--     v.file_meta,
--     v.section_content,
--     v.section_meta,
--     v.source_type,
--     v.source_data
--   from v_file_section_search_infos as v
--   where
--     (
--       v.section_content like '%' || search_text || '%'
--       or v.file_meta &` ('paths @ ".title" && string @ "' || search_text || '"')
--       or v.section_meta &` ('paths @ ".leadHeading.value" && string @ "' || search_text || '"')
--     )
--     and (
--       v.token = full_text_search.token
--       or v.public_api_key = full_text_search.public_api_key
--       or v.private_dev_api_key = full_text_search.private_dev_api_key
--     )
--   limit match_count;
-- end;
-- $$;

-- select
--   f.id as file_id,
--   f.path as file_path,
--   f.meta as file_meta,
--   fs.content as section_content,
--   fs.meta as section_meta,
--   s.type as source_type,
--   s.data as source_data,
--   p.id as project_id,
--   p.public_api_key as public_api_key,
--   p.private_dev_api_key as private_dev_api_key,
--   tok.value as token,
--   d.name as domain,
--   t.stripe_price_id as stripe_price_id,
--   t.is_enterprise_plan as is_enterprise_plan
-- from file_sections fs
-- left join files f on fs.file_id = f.id
-- left join sources s on f.source_id = s.id
-- left join projects p on s.project_id = p.id
-- left join tokens tok on p.id = tok.project_id
-- left join domains d on p.id = d.project_id
-- left join teams t on t.id = p.team_id;
-- where
--   (
--     v.section_content &@ 'process'
--     or array[
--       v.section_content,
--       v.file_meta#>'{title}',
--       v.section_meta#>'{leadHeading,value}'
--     ] &@ ('process', array[1, 100, 10], 'idx_file_sections_fts')::pgroonga_full_text_search_condition
--   )
--   and (
--     v.token = 'oHAtY4LmJ8TX9N8FxdOFpRyiA35Nhyzl'
--   )
-- limit 3;

-- Reference: https://github.com/pgroonga/pgroonga/discussions/344
-- select
--   f.id as file_id,
--   f.meta as file_meta,
--   fs.content as section_content,
--   fs.meta as section_meta,
--   coalesce(f.score, 0) as f_score,
--   coalesce(fs_search.score, 0) as fs_score
-- from file_sections fs
-- left join (select id,
--                   meta,
--                   pgroonga_score(tableoid, ctid) as score
--             from files
--            where meta->>'title' &@ ('full', array[100], 'idx_files_meta_title_fts')::pgroonga_full_text_search_condition
--           ) f on fs.file_id = f.id
-- left join (select id,
--                   pgroonga_score(tableoid, ctid) as score
--             from file_sections
--            where
--                ARRAY[
--                  content,
--                  meta->'leadHeading'->>'value'
--                ] &@ ('full', array[1, 10], 'idx_file_sections_fts')::pgroonga_full_text_search_condition
--           ) fs_search on fs.id = fs_search.id
-- order by f_score desc, fs_score desc
-- limit 10;