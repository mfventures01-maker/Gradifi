-- ============================================================================
-- GRADIFI / SEFAES - PHASE 3: BULK STUDENT IMPORT RPC
-- Created: 2026-08-21
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_enroll_students(
    p_students JSONB,
    p_school_id UUID,
    p_institution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student JSONB;
    v_student_id UUID;
    v_pin TEXT;
    v_results JSONB[] := '{}';
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_class_id UUID;
    v_class_name TEXT;
    v_school_name TEXT;
BEGIN
    -- Get school name for logging
    SELECT school_name INTO v_school_name
    FROM public.schools
    WHERE id = p_school_id;

    -- Loop through each student in the JSON array
    FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
    LOOP
        BEGIN
            -- Validate required fields
            IF v_student->>'first_name' IS NULL OR trim(v_student->>'first_name') = '' THEN
                v_results := v_results || jsonb_build_object(
                    'row', v_student,
                    'error', 'First name is required',
                    'status', 'failed'
                );
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;

            IF v_student->>'last_name' IS NULL OR trim(v_student->>'last_name') = '' THEN
                v_results := v_results || jsonb_build_object(
                    'row', v_student,
                    'error', 'Last name is required',
                    'status', 'failed'
                );
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;

            IF v_student->>'class_name' IS NULL OR trim(v_student->>'class_name') = '' THEN
                v_results := v_results || jsonb_build_object(
                    'row', v_student,
                    'error', 'Class name is required',
                    'status', 'failed'
                );
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;

            -- Find class ID by name
            SELECT id INTO v_class_id
            FROM public.classes
            WHERE school_id = p_school_id
            AND LOWER(name) = LOWER(trim(v_student->>'class_name'));

            IF v_class_id IS NULL THEN
                v_results := v_results || jsonb_build_object(
                    'row', v_student,
                    'error', format('Class "%s" not found in this school', v_student->>'class_name'),
                    'status', 'failed'
                );
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;

            -- Generate 4-digit PIN
            v_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

            -- Insert student
            INSERT INTO public.students (
                first_name,
                last_name,
                student_number,
                class_id,
                school_id,
                institution_id,
                gender,
                date_of_birth,
                created_at
            ) VALUES (
                trim(v_student->>'first_name'),
                trim(v_student->>'last_name'),
                generate_student_number(p_school_id),
                v_class_id,
                p_school_id,
                p_institution_id,
                COALESCE(trim(v_student->>'gender'), 'Male'),
                COALESCE((v_student->>'date_of_birth')::DATE, NOW()),
                NOW()
            ) RETURNING id INTO v_student_id;

            -- Get the generated student number
            INSERT INTO public.profiles (
                user_id,
                full_name,
                school_id,
                institution_id,
                role,
                pin_hash,
                authentication_method,
                pin_requires_change,
                created_at
            ) VALUES (
                v_student_id,
                trim(v_student->>'first_name') || ' ' || trim(v_student->>'last_name'),
                p_school_id,
                p_institution_id,
                'student',
                crypt(v_pin, gen_salt('bf', 10)),
                'pin',
                true,
                NOW()
            );

            v_success_count := v_success_count + 1;
            v_results := v_results || jsonb_build_object(
                'student_id', v_student_id,
                'student_number', (SELECT student_number FROM students WHERE id = v_student_id),
                'pin', v_pin,
                'first_name', trim(v_student->>'first_name'),
                'last_name', trim(v_student->>'last_name'),
                'class', trim(v_student->>'class_name'),
                'status', 'success'
            );

        EXCEPTION WHEN OTHERS THEN
            v_failed_count := v_failed_count + 1;
            v_results := v_results || jsonb_build_object(
                'row', v_student,
                'error', SQLERRM,
                'status', 'failed'
            );
        END;
    END LOOP;

    -- Audit log
    INSERT INTO public.system_activity_logs (
        institution_id,
        profile_id,
        action,
        details,
        created_at
    ) VALUES (
        p_institution_id,
        NULL,
        'BULK_STUDENT_IMPORT',
        jsonb_build_object(
            'school_name', v_school_name,
            'total_submitted', jsonb_array_length(p_students),
            'success_count', v_success_count,
            'failed_count', v_failed_count,
            'imported_at', NOW()
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'total_submitted', jsonb_array_length(p_students),
        'success_count', v_success_count,
        'failed_count', v_failed_count,
        'results', v_results
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_enroll_students(JSONB, UUID, UUID) TO authenticated;
