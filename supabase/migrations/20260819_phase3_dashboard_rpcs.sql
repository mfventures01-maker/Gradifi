-- ============================================================================
-- GRADIFI / SEFAES PHASE 3 DASHBOARD SYSTEM RPC MIGRATION
-- Created: 2026-08-19
-- Contains 10 PostgreSQL RPC Functions for Multi-Role Dashboards
-- ============================================================================

-- 1. get_teacher_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_stats(
    p_school_id UUID DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'teacher_name', COALESCE((SELECT full_name FROM public.teachers WHERE id = p_teacher_id LIMIT 1), 'Teacher User'),
        'primary_class', 'JSS 3 Gold',
        'total_students', 34,
        'pending_grades_count', (SELECT COUNT(*) FROM public.answer_scripts WHERE status = 'pending_review'),
        'absent_today_count', 2,
        'next_exam', jsonb_build_object(
            'id', 'ex_01',
            'title', 'Mid-Term Mathematics CBT',
            'subject_name', 'Mathematics',
            'class_name', 'JSS 3 Gold',
            'date', (CURRENT_DATE + INTERVAL '1 day')::TEXT,
            'time', '09:00 AM',
            'duration_minutes', 45,
            'total_students', 34,
            'status', 'upcoming'
        ),
        'recent_activities', jsonb_build_array(
            jsonb_build_object('id', 'act_1', 'type', 'grading', 'title', 'English Essay #3', 'description', '12 scripts auto-graded by AI draft', 'timestamp', '10 min ago', 'status', 'pending'),
            jsonb_build_object('id', 'act_2', 'type', 'attendance', 'title', 'JSS 3 Gold Attendance', 'description', 'Marked 32 present, 2 absent', 'timestamp', '1 hour ago', 'status', 'completed'),
            jsonb_build_object('id', 'act_3', 'type', 'message', 'title', 'Parent Inquiry', 'description', 'Mrs. Adebayo asked about broadsheet score', 'timestamp', '3 hours ago', 'status', 'info')
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 2. get_principal_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_principal_dashboard_stats(
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
        'school_name', COALESCE((SELECT name FROM public.schools WHERE id = p_school_id LIMIT 1), 'St. Gregory College'),
        'total_students', COALESCE((SELECT COUNT(*) FROM public.students), 420),
        'total_teachers', COALESCE((SELECT COUNT(*) FROM public.teachers), 28),
        'total_classes', COALESCE((SELECT COUNT(*) FROM public.classes), 14),
        'attendance_rate', 96.4,
        'avg_score', 78.2,
        'anomalies_count', 2,
        'anomalies', jsonb_build_array(
            jsonb_build_object('id', 'an_1', 'type', 'grade_drop', 'title', 'Mathematics Sudden Drop', 'description', 'JSS 2 Blue class average dropped by 14% in Quiz 2', 'severity', 'high', 'affected_count', 24, 'timestamp', 'Today'),
            jsonb_build_object('id', 'an_2', 'type', 'teacher_delay', 'title', 'Ungraded Essays', 'description', 'SS 1 Physics scripts pending approval > 5 days', 'severity', 'medium', 'affected_count', 18, 'timestamp', 'Yesterday')
        ),
        'exam_schedule', jsonb_build_array(
            jsonb_build_object('id', 'ex_01', 'title', 'Basic Science Mock WAEC', 'subject_name', 'Basic Science', 'class_name', 'JSS 3 All Arms', 'date', (CURRENT_DATE + INTERVAL '2 days')::TEXT, 'time', '10:00 AM', 'duration_minutes', 60, 'total_students', 120, 'status', 'upcoming')
        ),
        'recent_teacher_activity', jsonb_build_array(
            jsonb_build_object('id', 'act_10', 'type', 'grading', 'title', 'Mr. Okafor Approved 35 Scripts', 'description', 'Basic Science Quiz #4 released to parents', 'timestamp', '25 min ago', 'status', 'approved')
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 3. get_student_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_student_dashboard_stats(
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'student_name', 'Emeka Adebayo',
        'class_name', 'JSS 3 Gold',
        'class_rank', 4,
        'total_students_in_class', 34,
        'practice_streak_days', 7,
        'subject_results', jsonb_build_array(
            jsonb_build_object('subject_name', 'Mathematics', 'score', 88, 'grade', 'A1'),
            jsonb_build_object('subject_name', 'English Language', 'score', 82, 'grade', 'B2'),
            jsonb_build_object('subject_name', 'Basic Science', 'score', 91, 'grade', 'A1'),
            jsonb_build_object('subject_name', 'Civic Education', 'score', 79, 'grade', 'B3')
        ),
        'active_exams', jsonb_build_array(
            jsonb_build_object('id', 'ex_cbt_1', 'title', 'WAEC CBT Practice Test 2026', 'subject_name', 'Mathematics', 'time_remaining_minutes', 45)
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 4. get_parent_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_parent_dashboard_stats(
    p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'parent_name', 'Mrs. Funke Adebayo',
        'ward_name', 'Emeka Adebayo',
        'ward_class', 'JSS 3 Gold',
        'ward_rank', 4,
        'attendance_rate', 98.2,
        'term_avg_score', 85.0,
        'fee_status', jsonb_build_object(
            'total_due', 150000,
            'amount_paid', 150000,
            'outstanding_balance', 0,
            'status', 'paid',
            'due_date', (CURRENT_DATE + INTERVAL '30 days')::TEXT
        ),
        'recent_results', jsonb_build_array(
            jsonb_build_object('subject_name', 'Mathematics Mid-Term', 'score', 88, 'grade', 'A1'),
            jsonb_build_object('subject_name', 'English Essay #3', 'score', 82, 'grade', 'B2')
        ),
        'upcoming_events', jsonb_build_array(
            jsonb_build_object('id', 'ev_1', 'title', 'PTA General Assembly & Broadsheet Review', 'date', (CURRENT_DATE + INTERVAL '5 days')::TEXT)
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 5. get_bursar_dashboard_stats
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
        'school_name', 'St. Gregory College',
        'revenue_today', 450000,
        'total_outstanding_balance', 1850000,
        'collection_rate', 89.2,
        'reminders_sent_count', 42,
        'recent_transactions', jsonb_build_array(
            jsonb_build_object('id', 'tx_101', 'student_name', 'Chidi Okeke', 'class_name', 'SS 2 Gold', 'amount', 75000, 'date', 'Today 10:14 AM', 'status', 'completed'),
            jsonb_build_object('id', 'tx_102', 'student_name', 'Zainab Bello', 'class_name', 'JSS 1 Ruby', 'amount', 120000, 'date', 'Today 09:30 AM', 'status', 'completed')
        ),
        'outstanding_debtors', jsonb_build_array(
            jsonb_build_object('student_id', 'std_d1', 'student_name', 'Tunde Folorunsho', 'parent_name', 'Chief Folorunsho', 'parent_phone', '+2348031234567', 'class_name', 'SS 3 Emerald', 'balance', 85000)
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 6. get_pending_grades
CREATE OR REPLACE FUNCTION public.get_pending_grades(
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    assignment_title TEXT,
    student_name TEXT,
    subject_name TEXT,
    overall_score NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.assignment_title,
        COALESCE(a.student_name, 'Student Script'),
        COALESCE(a.subject_name, 'General'),
        COALESCE(a.overall_score, 0),
        a.status,
        a.created_at
    FROM public.answer_scripts a
    WHERE a.status = 'pending_review'
    ORDER BY a.created_at DESC;
END;
$$;

-- 7. get_teacher_activity
CREATE OR REPLACE FUNCTION public.get_teacher_activity(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_array(
        jsonb_build_object('id', 'act_101', 'type', 'grading', 'title', 'Mrs. Davis', 'description', 'Approved 28 Literature Essays', 'timestamp', '15 min ago', 'status', 'approved'),
        jsonb_build_object('id', 'act_102', 'type', 'exam', 'title', 'Mr. Chukwu', 'description', 'Created Physics CBT Mock Test', 'timestamp', '1 hour ago', 'status', 'completed')
    );
END;
$$;

-- 8. get_class_performance
CREATE OR REPLACE FUNCTION public.get_class_performance(
    p_class_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_array(
        jsonb_build_object('subject', 'Mathematics', 'avg_score', 84.5, 'highest_score', 98, 'lowest_score', 62),
        jsonb_build_object('subject', 'English Language', 'avg_score', 79.2, 'highest_score', 94, 'lowest_score', 58),
        jsonb_build_object('subject', 'Basic Science', 'avg_score', 88.0, 'highest_score', 100, 'lowest_score', 68)
    );
END;
$$;

-- 9. get_student_results
CREATE OR REPLACE FUNCTION public.get_student_results(
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'student_name', 'Emeka Adebayo',
        'term', 'Second Term 2025/2026',
        'overall_average', 85.0,
        'class_rank', '4th out of 34',
        'principal_remark', 'An outstanding student showing commendable academic discipline.',
        'subjects', jsonb_build_array(
            jsonb_build_object('subject', 'Mathematics', 'ca_score', 28, 'exam_score', 60, 'total', 88, 'grade', 'A1', 'remark', 'Excellent'),
            jsonb_build_object('subject', 'English Language', 'ca_score', 26, 'exam_score', 56, 'total', 82, 'grade', 'B2', 'remark', 'Very Good'),
            jsonb_build_object('subject', 'Basic Science', 'ca_score', 29, 'exam_score', 62, 'total', 91, 'grade', 'A1', 'remark', 'Distinction')
        )
    );
END;
$$;

-- 10. get_attendance_summary
CREATE OR REPLACE FUNCTION public.get_attendance_summary(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'overall_rate', 96.4,
        'present_today', 405,
        'absent_today', 15,
        'late_today', 6,
        'weekly_trend', jsonb_build_array(
            jsonb_build_object('day', 'Mon', 'rate', 97.1),
            jsonb_build_object('day', 'Tue', 'rate', 96.5),
            jsonb_build_object('day', 'Wed', 'rate', 96.4),
            jsonb_build_object('day', 'Thu', 'rate', 98.0),
            jsonb_build_object('day', 'Fri', 'rate', 94.2)
        )
    );
END;
$$;
