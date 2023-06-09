create index idx_tokens_project_id on tokens(project_id);
create index idx_domain_project_id on domains(project_id);

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
    array_agg(distinct tok.value) as tokens,
    array_agg(distinct d.name) as domains,
    t.stripe_price_id as stripe_price_id,
    t.is_enterprise_plan as is_enterprise_plan
  from file_sections fs
  left join files f on fs.file_id = f.id
  left join sources s on f.source_id = s.id
  left join projects p on s.project_id = p.id
  left join tokens tok on p.id = tok.project_id
  left join domains d on p.id = d.project_id
  left join teams t on t.id = p.team_id
  group by
    f.id,
    f.path,
    f.meta,
    fs.id,
    fs.content,
    fs.meta,
    s.type,
    s.data,
    p.id,
    p.public_api_key,
    p.private_dev_api_key,
    t.stripe_price_id,
    t.is_enterprise_plan;

-- Need a unique index for the materialized view refresh to work
create unique index idx_section_id_fts on mv_fts (section_id);
create index idx_section_id_fts on mv_fts (section_id);
create index idx_tokens_fts on mv_fts (tokens)
create index idx_public_api_key_fts on mv_fts (public_api_key)
create index idx_private_dev_api_key_fts on mv_fts (private_dev_api_key)

create index idx_file_sections_fts
on mv_fts
using pgroonga ((array[
    section_content,
    (file_meta->>'title')::text,
    (section_meta->'leadHeading'->>'value')::text
  ]));

-- Make sure security definer is set, cf.
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
  file_path text,
  file_meta jsonb,
  section_id bigint,
  section_content text,
  section_meta jsonb,
  source_type source_type,
  source_data jsonb,
  score double precision
)
language plpgsql
as $$
begin
  return query
  select
    mv_fts.file_path,
    mv_fts.file_meta,
    mv_fts.section_id,
    mv_fts.section_content,
    mv_fts.section_meta jsonb,
    mv_fts.source_type source_type,
    mv_fts.source_data jsonb,
    pgroonga_score(mv_fts.tableoid, mv_fts.ctid) as score
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
      full_text_search.token_param = any(mv_fts.tokens)
      or mv_fts.public_api_key = full_text_search.public_api_key_param
      or mv_fts.private_dev_api_key = full_text_search.private_dev_api_key_param
    )
  limit match_count;
end;
$$;
