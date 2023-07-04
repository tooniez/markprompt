-- Add an auto-generated tsvector column
alter table file_sections
add column fts tsvector generated always as (to_tsvector(content)) stored;
