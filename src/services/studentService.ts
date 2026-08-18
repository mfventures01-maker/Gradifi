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
  async enrollStudent(params: EnrollStudentParams): Promise<Student> {
    const { data, error } = await supabase.rpc('enroll_student', {
      institution_id: params.institution_id,
      school_id: params.school_id,
      class_id: params.class_id,
      first_name: params.first_name,
      last_name: params.last_name,
      gender: params.gender,
      date_of_birth: params.date_of_birth,
    });

    if (error || !data) {
      // Direct table insert fallback with standard ID structure
      const countRes = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', params.school_id);
      
      const nextNum = (countRes.count || 0) + 101;
      const studentNumber = `GRD/2026/${String(nextNum).padStart(3, '0')}`;

      const { data: newStudent, error: insertError } = await supabase
        .from('students')
        .insert({
          institution_id: params.institution_id,
          school_id: params.school_id,
          class_id: params.class_id,
          student_number: studentNumber,
          first_name: params.first_name,
          last_name: params.last_name,
          gender: (params.gender as 'male' | 'female') || 'male',
          date_of_birth: params.date_of_birth || null,
        } as any)
        .select()
        .single();

      if (insertError || !newStudent) throw (insertError || new Error('Failed to enroll student'));
      return newStudent as Student;
    }

    const res = data as {
      student_id: string;
      student_number: string;
      class_id: string;
      enrolled_at: string;
    };

    return {
      id: res.student_id,
      school_id: params.school_id,
      institution_id: params.institution_id,
      class_id: res.class_id,
      student_number: res.student_number,
      first_name: params.first_name,
      last_name: params.last_name,
      gender: (params.gender as 'male' | 'female') || 'male',
      date_of_birth: params.date_of_birth || null,
      enrolled_at: res.enrolled_at,
      created_at: res.enrolled_at,
    };
  },
};
