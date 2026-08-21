-- ============================================================================
-- GRADIFI / SEFAES - AI GRADING WORKFLOW REMEDIATION
-- Constitutional Law 10: AI Is an Engine
-- Constitutional Law 11: Evidence Over Assumption
-- Created: 2026-08-21
-- ============================================================================

-- 1. Add missing columns to answer_scripts
ALTER TABLE public.answer_scripts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_score NUMERIC,
ADD COLUMN IF NOT EXISTS final_score NUMERIC,
ADD COLUMN IF NOT EXISTS confidence NUMERIC,
ADD COLUMN IF NOT EXISTS rubric_scores JSONB,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS override_justification TEXT,
ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assignment_title TEXT;

-- 2. Add status constraint
ALTER TABLE public.answer_scripts 
DROP CONSTRAINT IF EXISTS answer_scripts_status_check;

ALTER TABLE public.answer_scripts 
ADD CONSTRAINT answer_scripts_status_check 
CHECK (status IN ('pending', 'processing', 'pending_review', 'approved', 'overridden', 'released', 'failed'));

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_answer_scripts_status ON public.answer_scripts(status);
CREATE INDEX IF NOT EXISTS idx_answer_scripts_teacher_id ON public.answer_scripts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_answer_scripts_student_id ON public.answer_scripts(student_id);
