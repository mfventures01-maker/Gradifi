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

    if (error || !data || data.length === 0) {
      // Fallback default catalog if table is empty
      return [
        { id: 'sub_1', code: 'MTH', name: 'Mathematics', category: 'core', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_2', code: 'ENG', name: 'English Language', category: 'core', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_3', code: 'BIO', name: 'Biology', category: 'science', is_practical: true, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_4', code: 'CHM', name: 'Chemistry', category: 'science', is_practical: true, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_5', code: 'PHY', name: 'Physics', category: 'science', is_practical: true, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_6', code: 'ECO', name: 'Economics', category: 'commercial', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_7', code: 'GOV', name: 'Government', category: 'arts', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_8', code: 'LIT', name: 'Literature-in-English', category: 'arts', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_9', code: 'ACC', name: 'Financial Accounting', category: 'commercial', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_10', code: 'AGR', name: 'Agricultural Science', category: 'science', is_practical: true, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_11', code: 'CIV', name: 'Civic Education', category: 'core', is_practical: false, curriculum: 'WAEC', created_at: new Date().toISOString() },
        { id: 'sub_12', code: 'CSC', name: 'Computer Studies / ICT', category: 'science', is_practical: true, curriculum: 'WAEC', created_at: new Date().toISOString() },
      ];
    }

    return data as SubjectCatalogItem[];
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
