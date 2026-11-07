/**
 * GRADIFI x SEFAES - ONBOARDING SERVICE
 * Canonical SSoT interaction with Supabase RPCs, institution_onboarding table, and validation.
 */

import { supabase } from '../lib/supabase';
import { InstitutionOnboarding } from '../contracts/schema';
import { ReconcileAndLaunchParams, ReconciliationReport } from '../contracts/rpc';

export interface CreateInstitutionFormInput {
  institution_name: string;
  institution_type: 'secondary' | 'primary' | 'k12' | 'group_of_schools';
  registration_number: string;
  principal_password: string;
  registration_number: string;
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
  curriculum_type?: string;
}

export interface CreateInstitutionAccountResponse {
  institution_id: string;
  school_id: string;
  name: string;
  type: string;
  country: string;
  created_at?: string;
  success: boolean;
  requires_email_confirmation?: boolean;
  url_slug?: string;
  institution_path?: string;
}

export interface HigherInstitutionFormInput {
  institution_name: string;
  institution_type: 'university' | 'polytechnic' | 'college_of_education';
  registration_number: string;
  country?: string;
  address: string;
  phone: string;
  website?: string;
  dean_name: string;
  dean_email: string;
  dean_phone: string;
  dean_password: string;
}

export interface InitializeClassesResponse {
  classes_created: number;
  classes: Array<{ id: string; name: string }>;
  success: boolean;
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
  login_id?: string;
  pin?: string;
  user_id?: string;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  institution_id?: string;
  success: boolean;
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
  login_id?: string;
  pin?: string;
  user_id?: string;
  student_id: string;
  student_number: string;
  class_id: string;
  enrolled_at: string;
  success: boolean;
}

export const onboardingService = {
  /**
   * Root registration always starts with a real Supabase Auth identity.
   * The verified user then asks the Edge Function to atomically create the
   * institution, campus, root profile and canonical actor.
   */
  async createInstitutionAccount(input: CreateInstitutionFormInput): Promise<CreateInstitutionAccountResponse> {
    return this.registerRootInstitution('bootstrap_school_institution', {
      institution_name: input.institution_name,
      institution_type: input.institution_type,
      registration_number: input.registration_number,
      country: input.country || 'Nigeria',
      address: input.address,
      state: input.state,
      lga: input.lga,
      phone: input.phone,
      website: input.website || '',
      principal_name: input.principal_name,
      principal_email: input.principal_email,
      principal_phone: input.principal_phone,
    }, input.principal_email, input.principal_password, input.principal_name);
  },

  async createHigherInstitutionAccount(input: HigherInstitutionFormInput): Promise<CreateInstitutionAccountResponse> {
    return this.registerRootInstitution('bootstrap_higher_institution', {
      institution_name: input.institution_name,
      institution_type: input.institution_type,
      registration_number: input.registration_number,
      country: input.country || 'Nigeria',
      address: input.address,
      phone: input.phone,
      website: input.website || '',
      dean_name: input.dean_name,
      dean_email: input.dean_email,
      dean_phone: input.dean_phone,
    }, input.dean_email, input.dean_password, input.dean_name);
  },

  async registerRootInstitution(
    action: 'bootstrap_school_institution' | 'bootstrap_higher_institution',
    payload: Record<string, string>,
    email: string,
    password: string,
    fullName: string,
  ): Promise<CreateInstitutionAccountResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 10 || !fullName.trim()) {
      throw new Error('ROOT_EMAIL_NAME_AND_PASSWORD_REQUIRED');
    }

    const pending = { action, payload, email: normalizedEmail };
    localStorage.setItem('sefaes.pending-root-onboarding', JSON.stringify(pending));

    const { data: signup, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: fullName.trim(), requested_root_action: action },
      },
    });
    if (signupError) {
      localStorage.removeItem('sefaes.pending-root-onboarding');
      throw new Error(`ROOT_AUTH_SIGNUP_FAILED: ${signupError.message}`);
    }

    if (!signup.session) {
      return {
        institution_id: '',
        school_id: '',
        name: String(payload.institution_name || ''),
        type: String(payload.institution_type || ''),
        country: String(payload.country || 'Nigeria'),
        success: true,
        requires_email_confirmation: true,
      };
    }

    return this.completePendingRootRegistration();
  },

  async completePendingRootRegistration(): Promise<CreateInstitutionAccountResponse> {
    const raw = localStorage.getItem('sefaes.pending-root-onboarding');
    if (!raw) throw new Error('NO_PENDING_ROOT_REGISTRATION');
    const pending = JSON.parse(raw) as {
      action: 'bootstrap_school_institution' | 'bootstrap_higher_institution';
      payload: Record<string, string>;
      email: string;
    };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) throw new Error('VERIFIED_ROOT_SESSION_REQUIRED');
    if (sessionData.session.user.email?.toLowerCase() !== pending.email) {
      throw new Error('ROOT_SESSION_EMAIL_MISMATCH');
    }

    const { data, error } = await supabase.functions.invoke('actor-onboarding', {
      body: { action: pending.action, ...pending.payload },
    });
    if (error || !data?.success || !data.institution_id || !data.school_id || !data.url_slug) {
      throw new Error(`ROOT_INSTITUTION_BOOTSTRAP_FAILED: ${error?.message || data?.error || 'INVALID_DATABASE_RECEIPT'}`);
    }

    localStorage.removeItem('sefaes.pending-root-onboarding');
    return {
      institution_id: data.institution_id,
      school_id: data.school_id,
      name: data.institution_name,
      type: String(pending.payload.institution_type || ''),
      country: String(pending.payload.country || 'Nigeria'),
      success: true,
      url_slug: data.url_slug,
      institution_path: data.institution_path,
    };
  },

  /**
   * 2. Initialize Secondary Classes RPC: initialize_secondary_classes
   * Generates JSS 1 to SS 3 class levels for the given school.
   */
  async initializeSecondaryClasses(schoolId: string): Promise<InitializeClassesResponse> {
    try {
      const { data, error } = await supabase.rpc('initialize_secondary_classes', {
        p_school_id: schoolId,
        school_id: schoolId,
      });

      if (error) throw new Error(`SECONDARY_CLASS_INITIALIZATION_FAILED: ${error.message}`);
      if (!data || !Array.isArray(data.classes) || typeof data.classes_created !== 'number') {
        throw new Error('SECONDARY_CLASS_INITIALIZATION_INVALID_RECEIPT');
      }
      return {
        classes_created: data.classes_created,
        classes: data.classes,
        success: true,
      };
    } catch (err: any) {
      console.error('onboardingService.initializeSecondaryClasses error:', err);
      throw new Error(err.message || 'Secondary classes initialization encountered an error.');
    }
  },

  /**
   * 3. Create Teacher RPC: create_teacher
   * Registers a certified teacher with an optional class_subject assignment.
   */
  async createTeacher(input: CreateTeacherInput): Promise<CreateTeacherResponse> {
    const { actorOnboardingService } = await import("./actorOnboardingService");
    const result = await actorOnboardingService.create({
      actor_type: "teacher",
      institution_id: input.institution_id || "",
      school_id: input.school_id,
      full_name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      class_subject_id: input.class_subject_id || null,
    });
    return {
      teacher_id: result.login_id,
      user_id: result.user_id,
      login_id: result.login_id,
      pin: result.pin,
      name: input.name,
      email: input.email,
      phone: input.phone,
      school_id: input.school_id,
      institution_id: input.institution_id,
      success: true,
    } as CreateTeacherResponse;
  },

  async enrollStudent(input: EnrollStudentInput): Promise<EnrollStudentResponse> {
    const { actorOnboardingService } = await import("./actorOnboardingService");
    const result = await actorOnboardingService.create({
      actor_type: "student",
      institution_id: input.institution_id || "",
      school_id: input.school_id,
      class_id: input.class_id,
      full_name: `${input.first_name} ${input.last_name}`,
      gender: input.gender,
      date_of_birth: input.date_of_birth,
    });
    return {
      student_id: result.actor_record_id || result.user_id,
      student_number: result.student_number || result.login_id,
      login_id: result.login_id,
      pin: result.pin,
      class_id: input.class_id,
      enrolled_at: new Date().toISOString(),
      success: true,
    } as EnrollStudentResponse;
  },

  /**
   * Fetch current canonical onboarding state for an institution
   */
  async getOnboardingState(institutionId: string): Promise<InstitutionOnboarding | null> {
    try {
      const { data, error } = await supabase
        .from('institution_onboarding')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch institution_onboarding:', error.message);
        return null;
      }
      return (data as InstitutionOnboarding) || null;
    } catch (err) {
      console.warn('getOnboardingState caught:', err);
      return null;
    }
  },

  /**
   * Update step or progress
   */
  async updateOnboardingProgress(institutionId: string, currentStep: number, isCompleted: boolean = false) {
    try {
      const { data, error } = await supabase
        .from('institution_onboarding')
        .upsert({
          institution_id: institutionId,
          current_step: currentStep,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as InstitutionOnboarding;
    } catch (err: any) {
      console.error('updateOnboardingProgress error:', err);
      throw err;
    }
  },

  /**
   * Authoritative final reconciliation and launch gatekeeper RPC
   */
  async reconcileAndLaunch(params: ReconcileAndLaunchParams): Promise<ReconciliationReport> {
    try {
      const { data, error } = await supabase.rpc('reconcile_and_launch', {
        institution_id: params.institution_id,
        school_id: params.school_id,
        parent_access: params.parent_access,
        cbt_activated: params.cbt_activated,
        ai_grading_activated: params.ai_grading_activated,
      });

      if (error || !data) {
        throw new Error(`RECONCILIATION_RPC_FAILED: ${error?.message || 'EMPTY_DATABASE_RECEIPT'}`);
      }

      return data as ReconciliationReport;
    } catch (err: any) {
      console.error('reconcileAndLaunch error:', err);
      throw new Error(err.message || 'Reconciliation and launch validation failed.');
    }
  },
};
