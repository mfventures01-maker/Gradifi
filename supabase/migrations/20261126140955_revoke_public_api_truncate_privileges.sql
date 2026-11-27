-- Revoke TRUNCATE from public API roles on all existing public tables.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
