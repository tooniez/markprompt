drop materialized view mv_fts;
drop function fts_with_private_dev_api_key;
drop function fts_with_public_api_key;
drop function create_fts_index;
drop function refresh_materialized_view;
drop index idx_section_id_fts;
drop index idx_file_sections_fts;
drop index ix_file_sections_content;

-- Tables

-- Add a computed field with parent file meta for FTS
alter table file_sections
add column cf_file_meta jsonb,
add column cf_project_id uuid references public.projects on delete cascade;

-- Indexes

-- Note that creating this index in the dashboard times out for
-- large tables, hence the `create_fts_index` defined below to
-- trigger it via API.
create index idx_projects_private_dev_api_key on projects(private_dev_api_key);
create index idx_projects_public_api_key on projects(public_api_key);
create index idx_file_sections_cf_project_id on file_sections (cf_project_id);
create index idx_file_sections_fts
on file_sections
using pgroonga ((array[
    content,
    (cf_file_meta->>'title')::text,
    (meta->'leadHeading'->>'value')::text
  ]));

-- Functions

-- Helper function to create the index via API (as it times out in
-- the dashboard).

create or replace function create_fts_index()
returns void
security definer
as $$
begin
  create index idx_file_sections_fts
    on file_sections
    using pgroonga ((array[
        content,
        (cf_file_meta->>'title')::text,
        (meta->'leadHeading'->>'value')::text
      ]));
end;
$$ language plpgsql;

-- Automatically compute the file meta
create or replace function update_file_sections_cf_file_meta()
returns trigger
language plpgsql
as $$
begin
  select meta into new.cf_file_meta from public.files where id = new.file_id;
  return new;
end;
$$;

-- Automatically compute the project id
create or replace function update_file_sections_cf_project_id()
returns trigger
language plpgsql
as $$
begin
  new.cf_project_id := (
    select s.project_id
    from sources s
    join files f on f.source_id = s.id
    where f.id = new.file_id
    limit 1
  );
  return new;
end;
$$;

-- Full text search

create or replace function fts(
  search_term text,
  match_count int,
  project_id uuid
)
returns table (
  id bigint,
  content text,
  meta jsonb,
  file_id bigint,
  file_meta jsonb
)
language plpgsql
as $$
begin
  return query
  select
    fs.id,
    fs.content,
    fs.meta,
    fs.file_id as file_id,
    fs.cf_file_meta as file_meta
  from file_sections fs
  where
    fs.cf_project_id = fts.project_id
    and (
      array[
        (fs.cf_file_meta->>'title')::text,
        (fs.meta->'leadHeading'->>'value')::text,
        fs.content
      ] &@ (fts.search_term, array[100, 10, 1], 'idx_file_sections_fts')::pgroonga_full_text_search_condition
    )
  limit match_count;
end;
$$;

-- Triggers

create trigger trigger_update_file_sections_cf_file_meta
before insert or update on public.file_sections
for each row
execute function update_file_sections_cf_file_meta();

create trigger trigger_update_file_sections_cf_project_id
before insert or update on public.file_sections
for each row
execute function update_file_sections_cf_project_id();
