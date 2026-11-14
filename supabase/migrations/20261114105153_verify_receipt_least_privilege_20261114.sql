-- Verify-only least-privilege hardening for public receipt persistence.
-- Production application: 2026-11-14. Scope is one table only.
-- Public receipt lookup remains available to anon/authenticated.
-- Trusted server persistence remains available to service_role.

REVOKE ALL PRIVILEGES
ON TABLE public.public_verification_records
FROM anon, authenticated, service_role;

GRANT SELECT
ON TABLE public.public_verification_records
TO anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.public_verification_records
TO service_role;
