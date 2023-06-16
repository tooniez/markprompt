drop view v_insights_query_histogram_hour;
drop view v_insights_query_histogram_day;
drop view v_insights_query_histogram_week;
drop view v_insights_query_histogram_month;
drop view v_insights_query_histogram_year;

create view v_insights_query_histogram_hour as
select project_id, date_trunc('hour', created_at) as date, count(*) as count
from query_stats
group by date, project_id
order by date;

create view v_insights_query_histogram_day as
select project_id, date_trunc('day', created_at) as date, count(*) as count
from query_stats
group by date, project_id
order by date;

create view v_insights_query_histogram_week as
select project_id, date_trunc('week', created_at) as date, count(*) as count
from query_stats
group by date, project_id
order by date;

create view v_insights_query_histogram_month as
select project_id, date_trunc('month', created_at) as date, count(*) as count
from query_stats
group by date, project_id
order by date;

create view v_insights_query_histogram_year as
select project_id, date_trunc('year', created_at) as date, count(*) as count
from query_stats
group by date, project_id
order by date;