create type sync_status as enum ('running', 'errored', 'canceled', 'complete');

-- Sync queues
create table public.sync_queues (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at   timestamp with time zone,
  source_id  uuid references public.sources on delete cascade not null,
  status     sync_status not null,
  logs       jsonb[] not null default array[]::jsonb[]
);
comment on table public.sync_queues is 'Sync queues.';

create or replace function append_log_to_sync_queue(
  id uuid,
  entry jsonb
)
returns void
language plpgsql
as $$
begin
  update sync_queues
    set logs = logs || append_log_to_sync_queue.entry
    where sync_queues.id = append_log_to_sync_queue.id;
end;
$$;

alter table sync_queues
  enable row level security;