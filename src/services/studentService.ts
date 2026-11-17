/**
 * GRADIFI x SEFAES - STUDENT SERVICE
 * Canonical SSoT interaction with students and enroll_student RPC.
 */

import { supabase } from '../lib/supabase';
import { Student } from '../contracts/schema';
import { EnrollStudentParams } from '../contracts/rpc';

export const studentService = {
  /**
   * Get students for a school and optional class
   */
  async getStudents(schoolId: string, classId?: string): Promise<Student[]> {
    let query = supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query.order('last_name', { ascending: true });
    if (error) throw error;
    return (data as Student[]) || [];
  },

  /**
   * Enroll a new student with backend authoritative student number generation
   */
  async enrollStudent(params: EnrollStudentParams): Promise<Student & { login_id: string; pin: string; user_id: string }> {
    const { actorOnboardingService } = await import('./actorOnboardingService');
    const result = await actorOnboardingService.create({
      actor_type: 'student',
      institution_id: params.institution_id,
      school_id: params.school_id,
      class_id: params.class_id,
      full_name: `${params.first_name} ${params.last_name}`,
      gender: params.gender,
      date_of_birth: params.date_of_birth,
    });

    if (!result.actor_record_id) throw new Error('Student provisioning completed without a student registry record');

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', result.actor_record_id)
      .single();

    if (error || !student) throw (error || new Error('Provisioned student record could not be retrieved'));
    return { ...student, login_id: result.login_id, pin: result.pin, user_id: result.user_id };
  }
};
