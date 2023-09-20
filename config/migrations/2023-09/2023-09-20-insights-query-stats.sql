create view v_insights_query_stats as
  select
    qs.id as id,
    qs.created_at as created_at,
    qs.project_id as project_id,
    qs.processed_state as processed_state,
    qs.decrypted_prompt as decrypted_prompt,
    qs.no_response as no_response,
    qs.feedback as feedback,
    c.decrypted_metadata::jsonb as decrypted_conversation_metadata
  from decrypted_query_stats qs
  left join decrypted_conversations c on qs.conversation_id = c.id