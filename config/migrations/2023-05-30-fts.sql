-- Add an index on file_sections' content column for pgroonga extension.
create index ix_file_sections_content ON file_sections USING pgroonga(content);

create materialized view file_section_content_infos as
  select
    f.path as path,
    f.meta as meta,
    fs.content as content,
    s.type as source_type,
    s.data as source_data,
    p.id as project_id
  from file_sections fs
  left join files f on fs.file_id = f.id
  left join sources s on f.source_id = s.id
  left join projects p on s.project_id = p.id