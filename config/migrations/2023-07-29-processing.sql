create type query_stat_processed_state_new as enum ('processed', 'unprocessed', 'errored', 'skipped');

alter table query_stats
add column processed_state_new query_stat_processed_state_new default 'skipped';

update query_stats
set processed_state_new = 'processed' where processed_state = 'processed';
update query_stats
set processed_state_new = 'errored' where processed_state = 'ignored';
update query_stats
set processed_state_new = 'skipped' where processed_state = 'unprocessed';

alter table query_stats drop column processed_state;
alter table query_stats rename column processed_state_new to processed_state;

drop type query_stat_processed_state;

create type query_stat_processed_state as enum ('processed', 'unprocessed', 'errored', 'skipped');

alter table query_stats
add column processed_state_new query_stat_processed_state default 'skipped';

update query_stats
set processed_state_new = 'processed' where processed_state = 'processed';
update query_stats
set processed_state_new = 'skipped' where processed_state = 'skipped';
update query_stats
set processed_state_new = 'errored' where processed_state = 'errored';
update query_stats
set processed_state_new = 'unprocessed' where processed_state = 'unprocessed';

alter table query_stats drop column processed_state;
alter table query_stats rename column processed_state_new to processed_state;

drop type query_stat_processed_state_new;