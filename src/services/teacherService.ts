/**
 * GRADIFI x SEFAES - TEACHER SERVICE
 * Canonical SSoT interaction with teachers, teacher_subject_assignments, and create_teacher RPC.
 */

import { supabase } from '../lib/supabase';
import { Teacher } from '../contracts/schema';
import { CreateTeacherParams } from '../contracts/rpc';
import { identityProvisioningService } from './identityProvisioningService';

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
    if (!params.school_id) throw new Error('A verified school ID is required.');
    const result = await identityProvisioningService.provision({
      operation: 'create',
      request_id: crypto.randomUUID(),
      actor_type: 'teacher',
      school_id: params.school_id,
      full_name: params.name.trim(),
      email: params.email || null,
      phone: params.phone || null,
      teacher: { class_subject_ids: params.class_subject_ids || [] },
    });
    const credential = result.credential;
    return {
      id: credential.actor_id,
      user_id: credential.auth_user_id,
      profile_id: credential.profile_id,
      school_id: params.school_id,
      institution_id: params.institution_id,
      name: params.name,
      email: params.email || null,
      phone: params.phone || null,
    } as Teacher;
  },

  async getDashboardStats(teacherId?: string) {
    const { data, error } = await supabase.rpc('get_teacher_dashboard_stats' as any, {
      p_teacher_id: teacherId || null,
    });
    if (error) throw error;
    return data;
  },
};
