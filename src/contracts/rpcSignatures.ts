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
}
