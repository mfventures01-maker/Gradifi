-- ============================================================================
-- GRADIFI / SEFAES - PIN AUTHENTICATION ENHANCEMENT
-- Constitutional Law 3: Architecture Before Implementation
-- Created: 2026-08-21
-- ============================================================================

-- 1. Add PIN hash and tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_requires_change BOOLEAN DEFAULT false;

-- 2. Create index for phone lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Create PIN change function
CREATE OR REPLACE FUNCTION public.set_pin(
    p_user_id UUID,
    p_new_pin TEXT,
    p_force_change BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pin_hash TEXT;
    v_pin_length INTEGER;
    v_role_pin_length INTEGER;
    v_profile_role TEXT;
BEGIN
    -- Get user's role
    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_profile_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Validate PIN length based on role
    v_pin_length := LENGTH(p_new_pin);

    IF v_profile_role IN ('vp', 'vice_principal', 'bursar', 'teacher') THEN
        v_role_pin_length := 6;
    ELSIF v_profile_role IN ('student', 'parent') THEN
        v_role_pin_length := 4;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role for PIN authentication');
    END IF;

    IF v_pin_length != v_role_pin_length THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid PIN length. %s requires a %s-digit PIN.', v_profile_role, v_role_pin_length)
        );
    END IF;

    -- Hash the PIN using pgcrypto
    v_pin_hash := crypt(p_new_pin, gen_salt('bf', 10));

    -- Update the profile
    UPDATE public.profiles
    SET 
        pin_hash = v_pin_hash,
        pin_changed_at = NOW(),
        pin_requires_change = p_force_change,
        authentication_method = 'pin',
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'role', v_profile_role,
        'pin_length', v_role_pin_length,
        'requires_change', p_force_change
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pin(UUID, TEXT, BOOLEAN) TO authenticated;

-- 4. Update auth_pin_login to use hashed PINs
DROP FUNCTION IF EXISTS public.auth_pin_login(text, text);

CREATE OR REPLACE FUNCTION public.auth_pin_login(
    p_identifier TEXT,
    p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_pin_length INTEGER;
    v_role_pin_length INTEGER;
BEGIN
    -- 1. Fetch the profile by identifier (phone or staff_id or student_number)
    SELECT p.* INTO v_profile
    FROM public.profiles p
    LEFT JOIN public.teachers t ON t.user_id = p.user_id
    LEFT JOIN public.students s ON s.user_id = p.user_id
    WHERE 
        p.phone = p_identifier 
        OR p.email = p_identifier
        OR t.staff_id = p_identifier 
        OR s.student_number = p_identifier
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
    END IF;

    -- 2. Check if PIN is configured
    IF v_profile.pin_hash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PIN not configured for this account');
    END IF;

    -- 3. Check Lockout
    IF v_profile.locked_until IS NOT NULL AND v_profile.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account temporarily locked');
    END IF;

    -- 4. Enforce PIN length based on role
    v_pin_length := LENGTH(p_pin);

    IF v_profile.role IN ('vp', 'vice_principal', 'bursar', 'teacher') THEN
        v_role_pin_length := 6;
    ELSIF v_profile.role IN ('student', 'parent') THEN
        v_role_pin_length := 4;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role for PIN login');
    END IF;

    IF v_pin_length != v_role_pin_length THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Invalid PIN length. %s requires a %s-digit PIN.', v_profile.role, v_role_pin_length)
        );
    END IF;

    -- 5. Verify PIN using bcrypt comparison
    IF v_profile.pin_hash IS NULL OR NOT (v_profile.pin_hash = crypt(p_pin, v_profile.pin_hash)) THEN
        -- Track failed attempts
        UPDATE public.profiles
        SET 
            failed_attempts = COALESCE(failed_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL
            END
        WHERE id = v_profile.id;
        
        RETURN jsonb_build_object('success', false, 'error', 'Invalid PIN');
    END IF;

    -- 6. Reset failed attempts and update last login
    UPDATE public.profiles
    SET 
        failed_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        authentication_method = 'pin'
    WHERE id = v_profile.id;

    -- 7. Return profile data for session creation
    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile.id,
        'user_id', v_profile.user_id,
        'role', v_profile.role,
        'institution_id', v_profile.institution_id,
        'school_id', v_profile.school_id,
        'full_name', v_profile.full_name,
        'requires_change', v_profile.pin_requires_change
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auth_pin_login(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_pin_login(TEXT, TEXT) TO anon;

-- 5. Create PIN reset function (for Principal/Bursar/VP)
CREATE OR REPLACE FUNCTION public.reset_user_pin(
    p_user_id UUID,
    p_reset_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reset_pin TEXT;
    v_hashed_pin TEXT;
    v_profile_role TEXT;
BEGIN
    -- Get user role
    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_profile_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Generate random PIN based on role
    IF v_profile_role IN ('vp', 'vice_principal', 'bursar', 'teacher') THEN
        v_reset_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    ELSIF v_profile_role IN ('student', 'parent') THEN
        v_reset_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role for PIN authentication');
    END IF;

    -- Hash the new PIN
    v_hashed_pin := crypt(v_reset_pin, gen_salt('bf', 10));

    -- Update profile with new PIN and force change
    UPDATE public.profiles
    SET 
        pin_hash = v_hashed_pin,
        pin_changed_at = NOW(),
        pin_requires_change = true,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'new_pin', v_reset_pin,
        'requires_change', true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_pin(UUID, UUID) TO authenticated;
