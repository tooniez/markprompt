-- Add an enterprise plan flag in the team table
alter table teams
add column plan_details jsonb;
