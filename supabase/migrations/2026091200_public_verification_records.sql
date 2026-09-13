-- ============================================================================
-- GRADIFI / SEFAES HOEOS G6.1 - PUBLIC VERIFICATION PERSISTENCE SCHEMA & RLS
-- Created: 2026-09-12
-- Authority Layer: Persistent Verification Records & Public RLS Boundary
-- ============================================================================

-- 1. Create public_verification_records table
CREATE TABLE IF NOT EXISTS public.public_verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id TEXT NOT NULL UNIQUE,
    document_hash TEXT NOT NULL,
    evidence_hash TEXT NOT NULL,
    engine_version TEXT NOT NULL DEFAULT 'G5-DETERMINISTIC-v1',
    policy_version TEXT NOT NULL DEFAULT 'G3-POLICY-v1',
    overall_similarity NUMERIC NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 100),
    total_sources_found INTEGER NOT NULL DEFAULT 0,
    evidence_envelope JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Lookup Indexes for Fast Verification Resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_verification_records_verification_id 
    ON public.public_verification_records(verification_id);

CREATE INDEX IF NOT EXISTS idx_public_verification_records_document_hash 
    ON public.public_verification_records(document_hash);

CREATE INDEX IF NOT EXISTS idx_public_verification_records_evidence_hash 
    ON public.public_verification_records(evidence_hash);

CREATE INDEX IF NOT EXISTS idx_public_verification_records_created_at 
    ON public.public_verification_records(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.public_verification_records ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Anonymous and Authenticated SELECT (Public Verifier Read Access)
DROP POLICY IF EXISTS "Public Verification Record Select Policy" ON public.public_verification_records;
CREATE POLICY "Public Verification Record Select Policy"
    ON public.public_verification_records
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5. RLS Policy: Authenticated and Service Role INSERT (Trusted Verification Write Access)
DROP POLICY IF EXISTS "Public Verification Record Insert Policy" ON public.public_verification_records;
DROP POLICY IF EXISTS "Authenticated Verification Record Insert Policy" ON public.public_verification_records;
CREATE POLICY "Authenticated Verification Record Insert Policy"
    ON public.public_verification_records
    FOR INSERT
    TO authenticated, service_role
    WITH CHECK (true);

-- Note: UPDATE and DELETE are intentionally DENIED for all roles (default RLS deny)
-- to ensure non-repudiable, immutable academic verification evidence records.
