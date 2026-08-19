/**
 * GRADIFI CANONICAL DATABASE TYPES EXTENSION
 * Ensures all RPC functions have typed signatures including p_ parameter conventions.
 */

export interface SupabaseRpcSignatures {
  create_institution_account: {
    Args: {
      name?: string;
      type?: string;
      country?: string;
      institution_name?: string;
      institution_type?: string;
      registration_number?: string;
      address?: string;
      state?: string;
      lga?: string;
      phone?: string;
      email?: string;
      website?: string;
      principal_name?: string;
      principal_phone?: string;
      principal_email?: string;
      p_name?: string;
      p_type?: string;
      p_country?: string;
    };
    Returns: {
      institution_id: string;
      school_id?: string;
      name?: string;
      type?: string;
      country?: string;
      created_at?: string;
      success?: boolean;
    };
  };
  initialize_secondary_classes: {
    Args: {
      school_id?: string;
      p_school_id?: string;
    };
    Returns: {
      classes_created: number;
      classes: Array<{ id: string; name: string }>;
      success?: boolean;
    };
  };
  create_teacher: {
    Args: {
      institution_id?: string;
      school_id?: string;
      name?: string;
      email?: string;
      phone?: string;
      class_subject_ids?: string[];
      p_name?: string;
      p_email?: string;
      p_phone?: string;
      p_school_id?: string;
      p_class_subject_id?: string;
      p_institution_id?: string;
    };
    Returns: {
      teacher_id: string;
      school_id?: string;
      institution_id?: string;
      name?: string;
      email?: string;
      phone?: string;
      success?: boolean;
    };
  };
  enroll_student: {
    Args: {
      institution_id?: string;
      school_id?: string;
      class_id?: string;
      first_name?: string;
      last_name?: string;
      gender?: string;
      date_of_birth?: string;
      p_first_name?: string;
      p_last_name?: string;
      p_class_id?: string;
      p_school_id?: string;
      p_gender?: string;
      p_date_of_birth?: string;
      p_institution_id?: string;
    };
    Returns: {
      student_id: string;
      student_number: string;
      class_id?: string;
      enrolled_at?: string;
      success?: boolean;
    };
  };
  auth_pin_login: {
    Args: {
      pin?: string;
      institution_slug?: string;
      identifier?: string;
      p_identifier?: string;
      p_pin?: string;
    };
    Returns: {
      user_id: string;
      profile_id: string;
      institution_id: string;
      school_id?: string;
      role: string;
      token?: string;
      access_token?: string;
      refresh_token?: string;
    };
  };
  get_teacher_dashboard_stats: {
    Args: {
      p_teacher_id?: string;
      p_school_id?: string;
    };
    Returns: {
      pending_grades_count: number;
      upcoming_exams_count: number;
      active_classes_count: number;
      pending_approvals: number;
      recent_submissions: Array<{
        id: string;
        student_id: string;
        student_name: string;
        subject: string;
        status: string;
        score: number | null;
        confidence_score: number | null;
        created_at: string;
      }>;
    };
  };
  get_principal_dashboard_stats: {
    Args: {
      p_school_id?: string;
      p_institution_id?: string;
    };
    Returns: {
      total_students: number;
      total_teachers: number;
      total_classes: number;
      attendance_rate: number;
      pending_approvals: number;
      completion_percentage: number;
      anomaly_alerts: Array<{
        type: string;
        title: string;
        description: string;
        severity: string;
        timestamp: string;
      }>;
    };
  };
  get_student_dashboard_stats: {
    Args: {
      p_student_id: string;
      p_school_id?: string;
    };
    Returns: {
      assigned_exams_count: number;
      completed_exams_count: number;
      average_score: number;
      attendance_rate: number;
      rank_position: number;
      total_class_students: number;
      practice_streak: number;
      grade_summary: Array<{
        subject: string;
        score: number;
        grade: string;
      }>;
      active_exams: Array<{
        id: string;
        title: string;
        subject: string;
        duration_minutes: number;
        total_marks: number;
      }>;
    };
  };
  get_parent_dashboard_stats: {
    Args: {
      p_parent_id: string;
      p_institution_id?: string;
    };
    Returns: {
      wards_count: number;
      wards: Array<{
        id: string;
        first_name: string;
        last_name: string;
        student_number: string;
        class_name: string;
        class_arm: string;
        average_score: number;
      }>;
      fee_status: {
        total_due: number;
        total_paid: number;
        balance: number;
        due_date: string;
        status: string;
      };
      attendance_summary: {
        present_days: number;
        absent_days: number;
        attendance_rate: number;
      };
      upcoming_events: Array<{
        title: string;
        date: string;
        type: string;
      }>;
    };
  };
  get_bursar_dashboard_stats: {
    Args: {
      p_school_id?: string;
      p_institution_id?: string;
    };
    Returns: {
      total_revenue_today: number;
      total_collected_term: number;
      total_billed_term: number;
      outstanding_balance: number;
      payment_reminders_sent: number;
      collection_rate: number;
      students_count: number;
      recent_payments: Array<{
        id: string;
        payer_name: string;
        student_name: string;
        amount: number;
        channel: string;
        timestamp: string;
      }>;
    };
  };
  get_pending_grades: {
    Args: {
      p_teacher_id?: string;
      p_school_id?: string;
    };
    Returns: Array<{
      script_id: string;
      student_id: string;
      student_name: string;
      class_name: string;
      subject: string;
      status: string;
      confidence_score: number | null;
      submitted_at: string;
    }>;
  };
  get_teacher_activity: {
    Args: {
      p_school_id?: string;
      p_teacher_id?: string;
    };
    Returns: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      status: string;
      timestamp: string;
    }>;
  };
  get_class_performance: {
    Args: {
      p_class_id: string;
      p_school_id?: string;
    };
    Returns: Array<{
      subject: string;
      average_score: number;
      pass_rate: number;
      total_attempts: number;
    }>;
  };
  get_student_results: {
    Args: {
      p_student_id: string;
    };
    Returns: {
      student: {
        student_id: string;
        student_name: string;
        student_number: string;
        class_name: string;
        gender: string;
      };
      subject_grades: Array<{
        subject: string;
        score: number;
        grade: string;
        teacher_remark: string;
      }>;
      overall_average: number;
      principal_remark: string;
    };
  };
  get_attendance_summary: {
    Args: {
      p_school_id?: string;
      p_class_id?: string;
    };
    Returns: Array<{
      class_id: string;
      class_name: string;
      class_arm: string;
      total_enrolled: number;
      attendance_rate: number;
    }>;
  };
}
