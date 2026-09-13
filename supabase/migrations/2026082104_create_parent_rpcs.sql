-- ============================================================================
-- GRADIFI / SEFAES - PHASE 4: PARENT ONBOARDING RPCS
-- Created: 2026-08-21
-- ============================================================================

-- 1. create_parent RPC
CREATE OR REPLACE FUNCTION public.create_parent(
    p_student_id UUID,
    p_parent_name TEXT,
    p_parent_phone TEXT,
    p_parent_email TEXT DEFAULT NULL,
    p_relationship TEXT DEFAULT 'Parent',
    p_is_primary BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_id UUID;
    v_profile_id UUID;
    v_pin TEXT;
    v_user_id UUID;
    v_student_school_id UUID;
    v_student_institution_id UUID;
    v_student_name TEXT;
    v_school_name TEXT;
BEGIN
    -- Get student details
    SELECT 
        s.school_id, 
        s.institution_id,
        s.first_name || ' ' || s.last_name,
        sch.school_name
    INTO 
        v_student_school_id, 
        v_student_institution_id,
        v_student_name,
        v_school_name
    FROM public.students s
    JOIN public.schools sch ON sch.id = s.school_id
    WHERE s.id = p_student_id;

    IF v_student_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    -- Check if parent already exists for this student
    IF EXISTS (
        SELECT 1 FROM public.student_parent_relationships spr
        JOIN public.parents p ON p.id = spr.parent_id
        JOIN public.profiles pf ON pf.id = p.profile_id
        WHERE spr.student_id = p_student_id
        AND pf.phone = p_parent_phone
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This parent is already linked to this student'
        );
    END IF;

    -- Check if parent exists with this phone
    SELECT p.id, pf.id, pf.user_id INTO v_parent_id, v_profile_id, v_user_id
    FROM public.parents p
    JOIN public.profiles pf ON pf.id = p.profile_id
    WHERE pf.phone = p_parent_phone
    LIMIT 1;

    -- Generate 4-digit PIN
    v_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    IF v_profile_id IS NULL THEN
        -- Create new parent profile
        INSERT INTO public.profiles (
            full_name,
            email,
            phone,
            school_id,
            institution_id,
            role,
            pin_hash,
            authentication_method,
            pin_requires_change,
            created_at
        ) VALUES (
            p_parent_name,
            p_parent_email,
            p_parent_phone,
            v_student_school_id,
            v_student_institution_id,
            'parent',
            crypt(v_pin, gen_salt('bf', 10)),
            'pin',
            true,
            NOW()
        ) RETURNING id, user_id INTO v_profile_id, v_user_id;

        -- Create parent record
        INSERT INTO public.parents (
            profile_id,
            institution_id,
            child_student_id,
            created_at
        ) VALUES (
            v_profile_id,
            v_student_institution_id,
            p_student_id,
            NOW()
        ) RETURNING id INTO v_parent_id;

    ELSE
        -- Parent exists, just link to student
        v_parent_id := (SELECT id FROM public.parents WHERE profile_id = v_profile_id LIMIT 1);
    END IF;

    -- Create student-parent relationship
    INSERT INTO public.student_parent_relationships (
        student_id,
        parent_id,
        relationship,
        is_primary,
        can_view_results,
        can_view_attendance,
        can_receive_notifications,
        created_at
    ) VALUES (
        p_student_id,
        v_parent_id,
        p_relationship,
        p_is_primary,
        true,
        true,
        true,
        NOW()
    ) ON CONFLICT (student_id, parent_id) DO UPDATE
    SET 
        relationship = EXCLUDED.relationship,
        is_primary = EXCLUDED.is_primary,
        updated_at = NOW();

    -- Audit log
    INSERT INTO public.system_activity_logs (
        institution_id,
        profile_id,
        action,
        details,
        created_at
    ) VALUES (
        v_student_institution_id,
        v_profile_id,
        'PARENT_LINKED',
        jsonb_build_object(
            'student_id', p_student_id,
            'student_name', v_student_name,
            'parent_name', p_parent_name,
            'parent_phone', p_parent_phone,
            'relationship', p_relationship,
            'school_name', v_school_name
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'parent_id', v_parent_id,
        'profile_id', v_profile_id,
        'user_id', v_user_id,
        'parent_name', p_parent_name,
        'phone', p_parent_phone,
        'email', p_parent_email,
        'student_id', p_student_id,
        'student_name', v_student_name,
        'pin', v_pin,
        'is_existing', v_profile_id IS NOT NULL,
        'message', CASE 
            WHEN v_profile_id IS NULL THEN 'Parent created and linked successfully'
            ELSE 'Parent linked to student successfully'
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_parent(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 2. get_parent_dashboard_stats RPC
CREATE OR REPLACE FUNCTION public.get_parent_dashboard_stats(
    p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_parent_name TEXT;
    v_wards JSONB;
BEGIN
    -- Get parent name
    SELECT full_name INTO v_parent_name
    FROM public.profiles
    WHERE id = p_parent_id
    AND role = 'parent';

    IF v_parent_name IS NULL THEN
        RETURN jsonb_build_object('error', 'Parent not found');
    END IF;

    -- Get wards (students linked to this parent)
    SELECT jsonb_agg(
        jsonb_build_object(
            'student_id', s.id,
            'student_name', s.first_name || ' ' || s.last_name,
            'student_number', s.student_number,
            'class_name', c.name,
            'class_rank', COALESCE(
                (SELECT position FROM cbt_results_summary 
                 WHERE student_id = s.id 
                 ORDER BY created_at DESC LIMIT 1), 0
            ),
            'total_students_in_class', (
                SELECT COUNT(*) FROM students 
                WHERE class_id = s.class_id
            ),
            'attendance_rate', 98.2,
            'term_avg_score', COALESCE(
                (SELECT AVG(percentage) FROM cbt_results_summary 
                 WHERE student_id = s.id), 0
            )
        )
    ) INTO v_wards
    FROM public.student_parent_relationships spr
    JOIN public.students s ON s.id = spr.student_id
    JOIN public.classes c ON c.id = s.class_id
    WHERE spr.parent_id = p_parent_id;

    SELECT jsonb_build_object(
        'parent_name', v_parent_name,
        'wards', COALESCE(v_wards, '[]'::JSONB),
        'total_wards', COALESCE(jsonb_array_length(v_wards), 0)
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_dashboard_stats(UUID) TO authenticated;

-- 3. get_parent_children RPC
CREATE OR REPLACE FUNCTION public.get_parent_children(
    p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    class_name TEXT,
    student_number TEXT,
    relationship TEXT,
    is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS student_id,
        s.first_name || ' ' || s.last_name AS student_name,
        c.name AS class_name,
        s.student_number,
        spr.relationship,
        spr.is_primary
    FROM public.student_parent_relationships spr
    JOIN public.students s ON s.id = spr.student_id
    JOIN public.classes c ON c.id = s.class_id
    WHERE spr.parent_id = p_parent_id
    ORDER BY s.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_children(UUID) TO authenticated;
