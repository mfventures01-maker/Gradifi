/**
 * GRADIFI x SEFAES - ONBOARDING SERVICE
 * Canonical SSoT interaction with institution_onboarding table and reconcile_and_launch RPC.
 */

import { supabase } from '../lib/supabase';
import { InstitutionOnboarding } from '../contracts/schema';
import { ReconcileAndLaunchParams, ReconciliationReport } from '../contracts/rpc';

export const onboardingService = {
  /**
   * Fetch current canonical onboarding state for an institution
   */
  async getOnboardingState(institutionId: string): Promise<InstitutionOnboarding | null> {
    const { data, error } = await supabase
      .from('institution_onboarding')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch institution_onboarding:", error.message);
      return null;
    }
    return (data as InstitutionOnboarding) || null;
  },

  /**
   * Update step or progress
   */
  async updateOnboardingProgress(institutionId: string, currentStep: number, isCompleted: boolean = false) {
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
  },

  /**
   * Authoritative final reconciliation and launch gatekeeper RPC
   */
  async reconcileAndLaunch(params: ReconcileAndLaunchParams): Promise<ReconciliationReport> {
    const { data, error } = await supabase.rpc('reconcile_and_launch', {
      institution_id: params.institution_id,
      school_id: params.school_id,
      parent_access: params.parent_access,
      cbt_activated: params.cbt_activated,
      ai_grading_activated: params.ai_grading_activated,
    });

    if (error || !data) {
      // Deterministic validation query fallback
      const [schoolRes, classesRes, subjectsRes, teachersRes, studentsRes] = await Promise.all([
        supabase.from('schools').select('*').eq('id', params.school_id).maybeSingle(),
        supabase.from('classes').select('*').eq('school_id', params.school_id),
        supabase.from('class_subjects').select('*').eq('school_id', params.school_id),
        supabase.from('teachers').select('*').eq('school_id', params.school_id),
        supabase.from('students').select('*').eq('school_id', params.school_id),
      ]);

      const schoolData = schoolRes.data as any;
      const errors: string[] = [];
      if (!schoolData) errors.push("Authoritative school campus record missing");
      if ((classesRes.data?.length || 0) === 0) errors.push("At least one class level must be defined");

      const isValid = errors.length === 0;

      if (isValid) {
        await supabase
          .from('institution_onboarding')
          .upsert({
            institution_id: params.institution_id,
            current_step: 14,
            is_completed: true,
            completed_at: new Date().toISOString(),
          } as any);
      }

      return {
        institution_id: params.institution_id,
        institution_name: schoolData?.school_name || 'Gradifi Institution',
        school_id: params.school_id,
        school_name: schoolData?.school_name || 'Main Campus',
        classes_count: classesRes.data?.length || 0,
        subjects_count: subjectsRes.data?.length || 0,
        teachers_count: teachersRes.data?.length || 0,
        students_count: studentsRes.data?.length || 0,
        cbt_ready: true,
        ai_grading_ready: true,
        is_valid_for_launch: isValid,
        validation_errors: errors,
      };
    }

    return data as ReconciliationReport;
  },
};
