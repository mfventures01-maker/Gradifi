/**
 * GRADIFI CERTIFIED RPC & STATE SIGNATURES
 */

export interface CreateInstitutionAccountParams {
  name: string;
  type: 'secondary' | 'primary' | 'k12' | 'tertiary' | 'group_of_schools';
  country: string;
}

export interface CreateInstitutionAccountResult {
  institution_id: string;
  name: string;
  type: string;
  country: string;
  created_at: string;
}

export interface CreateAdminProfileParams {
  institution_id: string;
  full_name: string;
  email: string;
  role: 'admin';
  phone?: string;
}

export interface CreateSchoolWithClassesParams {
  institution_id: string;
  school_name: string;
  school_type: 'secondary' | 'primary' | 'comprehensive';
  email: string;
  phone: string;
  address: string;
  principal_name: string;
  vice_principal_name: string;
  initial_classes?: string[]; // e.g. ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']
}

export interface CreateSchoolResult {
  school_id: string;
  institution_id: string;
  school_name: string;
  classes_created_count: number;
  classes: Array<{ id: string; name: string }>;
}

export interface CreateTeacherParams {
  institution_id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  class_subject_ids?: string[];
}

export interface EnrollStudentParams {
  institution_id: string;
  school_id: string;
  class_id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female';
  date_of_birth: string;
}

export interface ReconcileAndLaunchParams {
  institution_id: string;
  school_id: string;
  parent_access: boolean;
  cbt_activated: boolean;
  ai_grading_activated: boolean;
}

export interface ReconciliationReport {
  institution_id: string;
  institution_name: string;
  school_id: string;
  school_name: string;
  classes_count: number;
  subjects_count: number;
  teachers_count: number;
  students_count: number;
  cbt_ready: boolean;
  ai_grading_ready: boolean;
  is_valid_for_launch: boolean;
  validation_errors: string[];
}
