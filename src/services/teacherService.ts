/**
 * GRADIFI x SEFAES - TEACHER SERVICE
 * Canonical SSoT interaction with teachers, teacher_subject_assignments, and create_teacher RPC.
 */

import { supabase } from '../lib/supabase';
import { Teacher } from '../contracts/schema';
import { CreateTeacherParams } from '../contracts/rpc';

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
    const { data, error } = await supabase.rpc('create_teacher', {
      institution_id: params.institution_id,
      school_id: params.school_id,
      name: params.name,
      email: params.email,
      phone: params.phone,
      class_subject_ids: params.class_subject_ids,
    });

    if (error || !data) {
      // Direct table insert fallback if authorized
      const { data: newTeacher, error: insertError } = await supabase
        .from('teachers')
        .insert({
          institution_id: params.institution_id,
          school_id: params.school_id,
          name: params.name,
          email: params.email,
          phone: params.phone || null,
        } as any)
        .select()
        .single();

      if (insertError || !newTeacher) throw (insertError || new Error('Failed to create teacher'));
      const typedTeacher = newTeacher as Teacher;

      // Optional subject assignments
      if (params.class_subject_ids && params.class_subject_ids.length > 0) {
        const assignments = params.class_subject_ids.map(csId => ({
          teacher_id: typedTeacher.id,
          class_subject_id: csId,
          school_id: params.school_id,
        }));
        await supabase.from('teacher_subject_assignments').insert(assignments as any);
      }

      return typedTeacher;
    }

    const res = data as {
      teacher_id: string;
      school_id: string;
      institution_id: string;
      name: string;
      email: string;
      phone: string;
    };

    return {
      id: res.teacher_id,
      profile_id: null,
      school_id: res.school_id,
      institution_id: res.institution_id,
      name: res.name,
      email: res.email,
      phone: res.phone || null,
      created_at: new Date().toISOString(),
    };
  },

  async getDashboardStats(teacherId?: string) {
    const { data, error } = await supabase.rpc('get_teacher_dashboard_stats' as any, {
      p_teacher_id: teacherId || null,
    });
    if (error) throw error;
    return data;
  },
};
