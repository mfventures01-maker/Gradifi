/**
 * GRADIFI x SEFAES - TEACHER SERVICE
 * Canonical SSoT interaction with teachers, teacher_subject_assignments, and create_teacher RPC.
 */

import { supabase } from '../lib/supabase';
import { Teacher } from '../contracts/schema';
import { CreateTeacherParams } from '../contracts/rpc';
import { actorOnboardingService } from './actorOnboardingService';

export const teacherService = {
  /**
   * Get teachers for a school
   */
  async getTeachers(schoolId: string): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Teacher[]) || [];
  },

  /**
   * Create teacher profile and assignments via verified RPC
   */
  async createTeacher(params: CreateTeacherParams): Promise<Teacher> {
    const result = await actorOnboardingService.create({
      actor_type: 'teacher',
      institution_id: params.institution_id,
      school_id: params.school_id,
      full_name: params.name,
      email: params.email,
      phone: params.phone,
      class_subject_ids: params.class_subject_ids || [],
    });
    const { data, error } = await supabase.from('teachers').select('*').eq('user_id', result.user_id).single();
    if (error || !data) throw (error || new Error('Provisioned teacher row was not readable'));
    return data as Teacher;
  },

  async getDashboardStats(teacherId?: string) {
    const { data, error } = await supabase.rpc('get_teacher_dashboard_stats' as any, {
      p_teacher_id: teacherId || null,
    });
    if (error) throw error;
    return data;
  },
};
