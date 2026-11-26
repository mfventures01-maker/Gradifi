-- Prevent future public tables created by the postgres role from inheriting TRUNCATE.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
