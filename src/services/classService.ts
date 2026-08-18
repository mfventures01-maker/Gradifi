/**
 * GRADIFI x SEFAES - CLASS SERVICE
 * Canonical SSoT interaction with classes table.
 */

import { supabase } from '../lib/supabase';
import { ClassEntity } from '../contracts/schema';

export const classService = {
  /**
   * Get all classes for a school
   */
  async getClasses(schoolId: string): Promise<ClassEntity[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as ClassEntity[]) || [];
  },

  /**
   * Create a new class arm or level
   */
  async createClass(schoolId: string, name: string, arm?: string): Promise<ClassEntity> {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        school_id: schoolId,
        name,
        arm: arm || 'Gold',
      } as any)
      .select()
      .single();

    if (error || !data) throw (error || new Error('Failed to create class'));
    return data as ClassEntity;
  },
};
