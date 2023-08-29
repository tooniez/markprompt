-- Privileges

grant execute on function pgsodium.crypto_aead_det_decrypt (bytea, bytea, uuid, bytea) to authenticated;

-- Note: encrypted columns `prompt` and `response` have been set up through
-- the Supabase dashboard, and the old, unencrypted columns have been deleted
-- after the data way successfully moved to the encrypted columns.

update query_stats
set prompt = prompt_clear
where prompt is null;
update query_stats
set response = response_clear
where response is null;