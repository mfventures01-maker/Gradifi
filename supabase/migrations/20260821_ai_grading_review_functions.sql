-- ============================================================================
-- AI GRADING REVIEW FUNCTIONS
-- ============================================================================

-- 1. get_pending_review_scripts
CREATE OR REPLACE FUNCTION public.get_pending_review_scripts(
    p_teacher_id UUID DEFAULT NULL,
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    script_id UUID,
    student_name TEXT,
    class_name TEXT,
    subject_name TEXT,
    assignment_title TEXT,
    ai_score NUMERIC,
    confidence NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id AS script_id,
        COALESCE(s.first_name || ' ' || s.last_name, 'Student') AS student_name,
        c.name AS class_name,
        COALESCE(sub.name, 'General') AS subject_name,
        COALESCE(a.assignment_title, 'Assignment') AS assignment_title,
        a.ai_score,
        a.confidence,
        a.status,
        a.created_at
    FROM public.answer_scripts a
    LEFT JOIN public.students s ON s.id = a.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.subject_catalog sub ON sub.id = a.subject_id
    WHERE a.status = 'pending_review'
    AND (p_teacher_id IS NULL OR a.teacher_id = p_teacher_id)
    AND (p_school_id IS NULL OR a.school_id = p_school_id)
    ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_review_scripts(UUID, UUID) TO authenticated;

-- 2. approve_grading
CREATE OR REPLACE FUNCTION public.approve_grading(
    p_script_id UUID,
    p_reviewer_id UUID,
    p_final_score NUMERIC,
    p_teacher_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_script_id UUID;
BEGIN
    UPDATE public.answer_scripts
    SET 
        final_score = p_final_score,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        status = 'approved',
        teacher_feedback = p_teacher_feedback,
        updated_at = NOW()
    WHERE id = p_script_id
    AND status IN ('pending_review', 'processing')
    RETURNING id INTO v_script_id;

    IF v_script_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Script not found or not in review state');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'script_id', v_script_id,
        'status', 'approved',
        'final_score', p_final_score
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_grading(UUID, UUID, NUMERIC, TEXT) TO authenticated;

-- 3. override_grading
CREATE OR REPLACE FUNCTION public.override_grading(
    p_script_id UUID,
    p_reviewer_id UUID,
    p_final_score NUMERIC,
    p_override_justification TEXT,
    p_teacher_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_script_id UUID;
BEGIN
    -- Require justification for override
    IF p_override_justification IS NULL OR p_override_justification = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Override justification is required');
    END IF;

    -- Validate justification length
    IF LENGTH(p_override_justification) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Override justification must be at least 10 characters');
    END IF;

    UPDATE public.answer_scripts
    SET 
        final_score = p_final_score,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        status = 'overridden',
        override_justification = p_override_justification,
        teacher_feedback = p_teacher_feedback,
        updated_at = NOW()
    WHERE id = p_script_id
    AND status IN ('pending_review', 'processing')
    RETURNING id INTO v_script_id;

    IF v_script_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Script not found or not in review state');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'script_id', v_script_id,
        'status', 'overridden',
        'final_score', p_final_score,
        'override_justification', p_override_justification
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.override_grading(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-- 4. release_grading
CREATE OR REPLACE FUNCTION public.release_grading(
    p_script_id UUID,
    p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_script_id UUID;
BEGIN
    UPDATE public.answer_scripts
    SET 
        status = 'released',
        released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_script_id
    AND status IN ('approved', 'overridden')
    RETURNING id INTO v_script_id;

    IF v_script_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Script not found or not ready for release');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'script_id', v_script_id,
        'status', 'released',
        'released_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_grading(UUID, UUID) TO authenticated;

-- 5. get_human_ai_agreement
CREATE OR REPLACE FUNCTION public.get_human_ai_agreement(
    p_teacher_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total INTEGER;
    v_agreed INTEGER;
    v_agreement_rate NUMERIC;
BEGIN
    -- Count reviewed scripts where ai_score and final_score match
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('approved', 'overridden', 'released')) INTO v_total,
        COUNT(*) FILTER (WHERE status IN ('approved', 'overridden', 'released') AND ABS(COALESCE(ai_score, 0) - COALESCE(final_score, 0)) < 0.5) INTO v_agreed
    FROM public.answer_scripts
    WHERE (p_teacher_id IS NULL OR teacher_id = p_teacher_id);

    IF v_total IS NULL OR v_total = 0 THEN
        RETURN jsonb_build_object(
            'total_reviewed', 0,
            'agreement_count', 0,
            'agreement_rate', 0,
            'status', 'no_data'
        );
    END IF;

    v_agreement_rate := ROUND((v_agreed::NUMERIC / v_total::NUMERIC) * 100);

    RETURN jsonb_build_object(
        'total_reviewed', v_total,
        'agreement_count', v_agreed,
        'agreement_rate', v_agreement_rate,
        'status', CASE 
            WHEN v_agreement_rate >= 90 THEN 'excellent'
            WHEN v_agreement_rate >= 70 THEN 'good'
            WHEN v_agreement_rate >= 50 THEN 'fair'
            ELSE 'needs_review'
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_human_ai_agreement(UUID) TO authenticated;
