-- ============================================================================
-- GRADIFI / SEFAES - PHASE 2: VP & BURSAR ONBOARDING RPCS
-- Created: 2026-08-21
-- ============================================================================

-- 1. create_vp RPC
CREATE OR REPLACE FUNCTION public.create_vp(
    p_school_id UUID,
    p_institution_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_pin TEXT;
    v_user_id UUID;
BEGIN
    -- Check phone uniqueness within school
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE phone = p_phone AND school_id = p_school_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A user with this phone number already exists in this school'
        );
    END IF;

    -- Generate 6-digit PIN
    v_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    -- Create profile
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
        p_name,
        p_email,
        p_phone,
        p_school_id,
        p_institution_id,
        'vice_principal',
        crypt(v_pin, gen_salt('bf', 10)),
        'pin',
        true,
        NOW()
    ) RETURNING id, user_id INTO v_profile_id, v_user_id;

    -- Audit log
    INSERT INTO public.system_activity_logs (
        institution_id,
        profile_id,
        action,
        details,
        created_at
    ) VALUES (
        p_institution_id,
        v_profile_id,
        'VP_CREATED',
        jsonb_build_object(
            'name', p_name,
            'phone', p_phone,
            'email', p_email,
            'school_id', p_school_id
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'user_id', v_user_id,
        'full_name', p_name,
        'phone', p_phone,
        'email', p_email,
        'role', 'vice_principal',
        'pin', v_pin,
        'message', 'VP created successfully. Share the PIN with the user.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_vp(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 2. create_bursar RPC
CREATE OR REPLACE FUNCTION public.create_bursar(
    p_school_id UUID,
    p_institution_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_pin TEXT;
    v_user_id UUID;
BEGIN
    -- Check phone uniqueness within school
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE phone = p_phone AND school_id = p_school_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A user with this phone number already exists in this school'
        );
    END IF;

    -- Generate 6-digit PIN
    v_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    -- Create profile
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
        p_name,
        p_email,
        p_phone,
        p_school_id,
        p_institution_id,
        'bursar',
        crypt(v_pin, gen_salt('bf', 10)),
        'pin',
        true,
        NOW()
    ) RETURNING id, user_id INTO v_profile_id, v_user_id;

    -- Audit log
    INSERT INTO public.system_activity_logs (
        institution_id,
        profile_id,
        action,
        details,
        created_at
    ) VALUES (
        p_institution_id,
        v_profile_id,
        'BURSAR_CREATED',
        jsonb_build_object(
            'name', p_name,
            'phone', p_phone,
            'email', p_email,
            'school_id', p_school_id
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile_id,
        'user_id', v_user_id,
        'full_name', p_name,
        'phone', p_phone,
        'email', p_email,
        'role', 'bursar',
        'pin', v_pin,
        'message', 'Bursar created successfully. Share the PIN with the user.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_bursar(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 3. get_vp_dashboard_stats RPC
CREATE OR REPLACE FUNCTION public.get_vp_dashboard_stats(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total_classes INTEGER;
    v_total_teachers INTEGER;
    v_total_students INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_classes
    FROM public.classes
    WHERE school_id = p_school_id;

    SELECT COUNT(*) INTO v_total_teachers
    FROM public.teachers
    WHERE school_id = p_school_id;

    SELECT COUNT(*) INTO v_total_students
    FROM public.students
    WHERE school_id = p_school_id;

    SELECT jsonb_build_object(
        'total_classes', v_total_classes,
        'total_teachers', v_total_teachers,
        'total_students', v_total_students,
        'attendance_rate', 0,
        'anomalies_count', 0,
        'anomalies', jsonb_build_array(),
        'exam_schedule', jsonb_build_array(),
        'recent_teacher_activity', jsonb_build_array()
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vp_dashboard_stats(UUID) TO authenticated;

-- 4. get_bursar_dashboard_stats RPC
CREATE OR REPLACE FUNCTION public.get_bursar_dashboard_stats(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'revenue_today', 0,
        'total_outstanding_balance', 0,
        'collection_rate', 0,
        'reminders_sent_count', 0,
        'recent_transactions', jsonb_build_array(),
        'outstanding_debtors', jsonb_build_array()
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bursar_dashboard_stats(UUID) TO authenticated;
