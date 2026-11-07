/**
 * GRADIFI x SEFAES - SUBJECT SERVICE
 * Canonical SSoT interaction with subject_catalog and class_subjects.
 */

import { supabase } from '../lib/supabase';
import { SubjectCatalogItem, ClassSubject } from '../contracts/schema';

export const subjectService = {
  /**
   * Get standardized national / regional subject catalog (WAEC, NECO, JAMB)
   */
  async getSubjectCatalog(): Promise<SubjectCatalogItem[]> {
    const { data, error } = await supabase
      .from('subject_catalog')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as SubjectCatalogItem[]) || [];
  },

  /**
   * Get class-subject matrix for a school
   */
  async getClassSubjects(schoolId: string): Promise<ClassSubject[]> {
    const { data, error } = await supabase
      .from('class_subjects')
      .select('*')
      .eq('school_id', schoolId);

    if (error) throw error;
    return (data as ClassSubject[]) || [];
  },

  /**
   * Assign subjects to classes
   */
  async assignSubjectsToClasses(params: {
    school_id: string;
    institution_id: string;
    assignments: Array<{ class_id: string; subject_id: string }>;
  }): Promise<{ success: boolean; total_assigned: number }> {
    const inserts = params.assignments.map(a => ({
      class_id: a.class_id,
      subject_id: a.subject_id,
      school_id: params.school_id,
      institution_id: params.institution_id,
    }));

    const { data, error } = await supabase
      .from('class_subjects')
      .upsert(inserts as any)
      .select();

    if (error) throw error;
    return {
      success: true,
      total_assigned: data?.length || 0,
    };
  },
};
