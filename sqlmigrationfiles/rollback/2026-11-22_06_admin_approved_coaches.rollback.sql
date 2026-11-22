-- Reverts 2026-11-22_06 to the state after 2026-11-22_01 (coach sign-up grants coach directly).
drop trigger if exists sync_role_to_auth_metadata on public.users;
drop function if exists public.sync_role_to_auth_metadata();
-- Then re-run section 1 (handle_new_user) of 2026-11-22_01_block_role_escalation.sql.
