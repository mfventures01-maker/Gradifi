/**
 * GRADIFI x SEFAES - STUDENT SERVICE
 * Canonical SSoT interaction with students and enroll_student RPC.
 */

import { supabase } from '../lib/supabase';
import { Student } from '../contracts/schema';
import { EnrollStudentParams } from '../contracts/rpc';
import { identityProvisioningService } from './identityProvisioningService';

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
  async enrollStudent(params: EnrollStudentParams): Promise<Student> {
    if (!params.school_id) throw new Error('A verified school ID is required.');
    if (!params.class_id) throw new Error('A real class ID is required.');
    const result = await identityProvisioningService.provision({
      operation: 'create',
      request_id: crypto.randomUUID(),
      actor_type: 'student',
      school_id: params.school_id,
      full_name: `${params.first_name.trim()} ${params.last_name.trim()}`,
      student: {
        class_id: params.class_id,
        first_name: params.first_name.trim(),
        last_name: params.last_name.trim(),
        gender: params.gender,
        date_of_birth: params.date_of_birth || null,
      },
    });
    const credential = result.credential;
    const now = new Date().toISOString();
    return {
      id: credential.actor_id,
      user_id: credential.auth_user_id,
      school_id: params.school_id,
      institution_id: params.institution_id,
      class_id: params.class_id,
      student_number: credential.login_identifier,
      first_name: params.first_name,
      last_name: params.last_name,
      gender: params.gender,
      date_of_birth: params.date_of_birth || null,
      created_at: now,
      enrolled_at: now,
    } as Student;
  },
};
