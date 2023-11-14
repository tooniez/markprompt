## Encryption

Sometimes, tables cannot be altered due to computed views. This is a bug in Supabase:

> The bug where unrelated tables trigger view regeneration was fixed in pgsodium 3.1.8, you are on 3.1.5, so that fix is not present.

It usually complains about `decrypted_query_stats`. The solution is to:

- Drop the `v_insights_query_stats` view

```
drop view v_insights_query_stats;
```

- Perform the table altering

- Recreate the `v_insights_query_stats` view.

```
create view v_insights_query_stats as
  select
    qs.id as id,
    qs.conversation_id as conversation_id,
    qs.created_at as created_at,
    qs.project_id as project_id,
    qs.processed_state as processed_state,
    qs.decrypted_prompt as decrypted_prompt,
    qs.no_response as no_response,
    qs.feedback as feedback,
    c.decrypted_metadata::jsonb as decrypted_conversation_metadata
  from decrypted_query_stats qs
  left join decrypted_conversations c on qs.conversation_id = c.id;
```
