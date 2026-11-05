import { supabase } from '../lib/supabase';
import type { InstitutionOnboarding } from '../contracts/schema';
import type { ReconcileAndLaunchParams, ReconciliationReport } from '../contracts/rpc';

export interface CreateInstitutionFormInput {
  institution_name: string;
  institution_type: 'secondary' | 'polytechnic' | 'university' | 'enterprise';
  registration_number?: string;
  address: string;
  state: string;
  lga: string;
  phone: string;
  email: string;
  website?: string;
  principal_name: string;
  principal_phone: string;
  principal_email: string;
  country?: string;
  school_type?: string;
  class_name: string;
  subject: string;
}

export interface CreateInstitutionAccountResponse {
  institution_id: string;
  school_id: string;
  profile_id: string;
  success: true;
  recovered?: boolean;
  classes: Array<{ id: string; name: string }>;
  subject_id?: string;
  class_subject_id?: string;
}

export interface InitializeClassesResponse {
  classes_created: number;
  classes: Array<{ id: string; name: string; school_id?: string }>;
  success: true;
}

export interface CreateTeacherInput {
  institution_id?: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  class_subject_id?: string;
}

export interface CreateTeacherResponse {
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  institution_id?: string;
  success: true;
}

export interface EnrollStudentInput {
  institution_id?: string;
  school_id: string;
  class_id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female';
  date_of_birth?: string;
}

export interface EnrollStudentResponse {
  student_id: string;
  student_number: string;
  class_id: string;
  enrolled_at: string;
  success: true;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
}

export type StaffRole = 'teacher' | 'vice_principal' | 'bursar';

export interface SchoolStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_name: string;
}

export interface BulkStudentInput {
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  class_name: string;
}

export interface BulkStudentResponse {
  success: true;
  total_submitted: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    status: 'success' | 'failed';
    student_id?: string;
    student_number?: string;
    first_name?: string;
    last_name?: string;
    class?: string;
    error?: string;
  }>;
}

function requireObject(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid server response.`);
  }
  return value as Record<string, any>;
}

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} did not return a valid database identifier.`);
  }
  return value;
}

export const onboardingService = {
  async createInstitutionAccount(input: CreateInstitutionFormInput): Promise<CreateInstitutionAccountResponse> {
    const { data, error } = await supabase.rpc('gradifi_bootstrap_institution', {
      p_payload: {
        institution_name: input.institution_name.trim(),
        institution_type: input.institution_type,
        registration_number: input.registration_number?.trim() || null,
        school_type: input.school_type || 'private',
        country: input.country || 'Nigeria',
        address: input.address.trim(),
        state: input.state.trim(),
        lga: input.lga.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        website: input.website?.trim() || null,
        principal_name: input.principal_name.trim(),
        principal_phone: input.principal_phone.trim(),
        principal_email: input.principal_email.trim().toLowerCase(),
        class_name: input.class_name.trim(),
        subject: input.subject.trim(),
      },
    });
    if (error) throw new Error(`Institution provisioning failed: ${error.message}`);
    const result = requireObject(data, 'Institution provisioning');
    if (result.success !== true) throw new Error(result.error || 'Institution provisioning was not confirmed.');
    const classes = Array.isArray(result.classes) ? result.classes : [];
    if (classes.length === 0) throw new Error('Provisioning returned no persisted class records.');
    return {
      institution_id: requireUuid(result.institution_id, 'Institution provisioning'),
      school_id: requireUuid(result.school_id, 'Institution provisioning'),
      profile_id: requireUuid(result.profile_id, 'Principal identity provisioning'),
      success: true,
      recovered: result.recovered === true,
      classes: classes.map((row: any) => ({
        id: requireUuid(row.id, 'Class provisioning'),
        name: String(row.name),
      })),
      subject_id: result.subject_id ? requireUuid(result.subject_id, 'Subject provisioning') : undefined,
      class_subject_id: result.class_subject_id ? requireUuid(result.class_subject_id, 'Class-subject provisioning') : undefined,
    };
  },

  async getSchoolClasses(schoolId: string): Promise<SchoolClass[]> {
    requireUuid(schoolId, 'School context');
    const { data, error } = await supabase.rpc('gradifi_get_school_classes', { p_school_id: schoolId });
    if (error) throw new Error(`Could not load school classes: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('School class query returned an invalid response.');
    return data.map((row: any) => ({
      id: requireUuid(row.id, 'Class query'),
      school_id: requireUuid(row.school_id, 'Class query'),
      name: String(row.name),
    }));
  },

  async initializeSecondaryClasses(schoolId: string): Promise<InitializeClassesResponse> {
    requireUuid(schoolId, 'School context');
    const { data, error } = await supabase.rpc('gradifi_initialize_secondary_classes', { p_school_id: schoolId });
    if (error) throw new Error(`Class initialization failed: ${error.message}`);
    const result = requireObject(data, 'Class initialization');
    if (result.success !== true || !Array.isArray(result.classes) || result.classes.length === 0) {
      throw new Error('Class initialization returned no persisted class records.');
    }
    return {
      classes_created: Number(result.classes_created),
      classes: result.classes.map((row: any) => ({
        id: requireUuid(row.id, 'Class initialization'),
        name: String(row.name),
        school_id: requireUuid(row.school_id, 'Class initialization'),
      })),
      success: true,
    };
  },

  async getSchoolStudents(schoolId: string): Promise<SchoolStudent[]> {
    requireUuid(schoolId, 'School context');
    const [{ data, error }, classes] = await Promise.all([
      (supabase as any).from('students')
        .select('id,first_name,last_name,student_number,class_id')
        .eq('school_id', schoolId)
        .order('first_name'),
      this.getSchoolClasses(schoolId),
    ]);
    if (error) throw new Error(`Could not load school students: ${error.message}`);
    const classNames = new Map(classes.map((row) => [row.id, row.name]));
    return (data || []).map((row: any) => ({
      id: requireUuid(row.id, 'Student query'),
      first_name: String(row.first_name),
      last_name: String(row.last_name),
      student_number: String(row.student_number || ''),
      class_name: classNames.get(row.class_id) || 'Unassigned',
    }));
  },

  async bulkEnrollStudents(schoolId: string, students: BulkStudentInput[]): Promise<BulkStudentResponse> {
    requireUuid(schoolId, 'School context');
    if (!students.length || students.length > 500) throw new Error('Bulk import must contain between 1 and 500 students.');
    const { data, error } = await supabase.rpc('gradifi_bulk_create_students', {
      p_students: students,
      p_school_id: schoolId,
    });
    if (error) throw new Error(`Bulk student enrollment failed: ${error.message}`);
    const result = requireObject(data, 'Bulk student enrollment');
    if (result.success !== true || !Array.isArray(result.results)) {
      throw new Error('Bulk student enrollment was not confirmed by the server.');
    }
    return {
      success: true,
      total_submitted: Number(result.total_submitted),
      success_count: Number(result.success_count),
      failed_count: Number(result.failed_count),
      results: result.results,
    };
  },

  async createParentAccount(input: {
    student_id: string; name: string; phone: string; email: string;
    relationship: 'father' | 'mother' | 'guardian' | 'other'; is_primary: boolean;
  }) {
    requireUuid(input.student_id, 'Student context');
    if (!input.name.trim() || input.phone.trim().length < 7 || !input.email.trim()) {
      throw new Error('Parent name, valid phone number and email are required.');
    }
    const { data, error } = await supabase.functions.invoke('gradifi-parent-provision', {
      body: {
        student_id: input.student_id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim().toLowerCase(),
        relationship: input.relationship,
        is_primary: input.is_primary,
      },
    });
    if (error) throw new Error(`Parent provisioning failed: ${error.message}`);
    const result = requireObject(data, 'Parent provisioning');
    if (result.success !== true || !result.parent_id || !result.profile_id || !result.pin) {
      throw new Error(result.error || 'Parent profile and student relationship were not confirmed.');
    }
    return {
      parent_id: requireUuid(result.parent_id, 'Parent provisioning'),
      profile_id: requireUuid(result.profile_id, 'Parent provisioning'),
      parent_name: String(result.parent_name),
      phone: String(result.phone),
      email: String(result.email),
      student_id: requireUuid(result.student_id, 'Parent provisioning'),
      pin: String(result.pin),
      is_existing: result.is_existing === true,
    };
  },

  async createStaffAccount(input: { role: StaffRole; name: string; email: string; phone: string }) {
    if (!input.name.trim() || !input.email.trim() || input.phone.trim().length < 7) throw new Error('Staff name, email and a valid phone number are required.');
    const { data, error } = await supabase.functions.invoke('gradifi-staff-provision', {
      body: {
        role: input.role,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
      },
    });
    if (error) throw new Error(`Staff provisioning failed: ${error.message}`);
    const result = requireObject(data, 'Staff provisioning');
    if (result.success !== true || !result.profile_id || !result.pin) {
      throw new Error(result.error || 'Staff provisioning was not confirmed by the server.');
    }
    return {
      profile_id: requireUuid(result.profile_id, 'Staff provisioning'),
      teacher_id: result.teacher_id ? requireUuid(result.teacher_id, 'Staff provisioning') : undefined,
      full_name: String(result.full_name),
      role: input.role,
      email: String(result.email),
      pin: String(result.pin),
    };
  },

  async createTeacher(input: CreateTeacherInput): Promise<CreateTeacherResponse> {
    const result = await this.createStaffAccount({
      role: 'teacher', name: input.name, email: input.email, phone: input.phone,
    });
    return {
      teacher_id: result.teacher_id || (() => { throw new Error('Teacher row was not persisted by the server.'); })(),
      name: result.full_name,
      email: result.email,
      phone: input.phone,
      school_id: input.school_id,
      institution_id: input.institution_id,
      success: true,
    };
  },

  async enrollStudent(input: EnrollStudentInput): Promise<EnrollStudentResponse> {
    const { data, error } = await supabase.rpc('gradifi_create_student', {
      p_class_id: input.class_id,
      p_first_name: input.first_name.trim(),
      p_last_name: input.last_name.trim(),
      p_gender: input.gender,
      p_date_of_birth: input.date_of_birth || null,
    });
    if (error) throw new Error(`Student enrollment failed: ${error.message}`);
    const result = requireObject(data, 'Student enrollment');
    if (result.success !== true) throw new Error(result.error || 'Student enrollment was not confirmed.');
    return {
      student_id: requireUuid(result.student_id, 'Student enrollment'),
      student_number: String(result.student_number || ''),
      class_id: requireUuid(result.class_id, 'Student enrollment'),
      enrolled_at: String(result.enrolled_at),
      success: true,
    };
  },

  async getOnboardingState(institutionId: string): Promise<InstitutionOnboarding | null> {
    const { data, error } = await supabase.from('institution_onboarding')
      .select('*').eq('institution_id', institutionId).maybeSingle();
    if (error) throw new Error(`Could not retrieve onboarding progress: ${error.message}`);
    return (data as InstitutionOnboarding) || null;
  },

  async updateOnboardingProgress(institutionId: string, currentStep: number, isCompleted = false) {
    const { data, error } = await supabase.rpc('gradifi_update_onboarding_progress', {
      p_institution_id: institutionId,
      p_current_step: currentStep,
      p_is_completed: isCompleted,
    });
    if (error) throw new Error(`Could not save onboarding progress: ${error.message}`);
    const result = requireObject(data, 'Onboarding progress');
    if (result.success !== true) throw new Error('Onboarding progress was not persisted.');
    return result;
  },

  async reconcileAndLaunch(params: ReconcileAndLaunchParams): Promise<ReconciliationReport> {
    const { data, error } = await supabase.rpc('reconcile_and_launch', {
      institution_id: params.institution_id,
      school_id: params.school_id,
      parent_access: params.parent_access,
      cbt_activated: params.cbt_activated,
      ai_grading_activated: params.ai_grading_activated,
    });
    if (error) throw new Error(`Onboarding reconciliation failed: ${error.message}`);
    const result = requireObject(data, 'Onboarding reconciliation');
    if (result.is_valid_for_launch !== true) {
      throw new Error(Array.isArray(result.validation_errors) ? result.validation_errors.join('; ') : 'Institution is not ready to launch.');
    }
    return result as unknown as ReconciliationReport;
  },
};
