/**
 * GRADIFI x SEFAES - SCHOOL SERVICE
 * Canonical SSoT interactions with schools table and create_school_with_classes RPC.
 */

import { supabase } from '../lib/supabase';
import { School } from '../contracts/schema';
import { CreateSchoolWithClassesParams, CreateSchoolResult } from '../contracts/rpc';

export const schoolService = {
  /**
   * Get schools for an institution (governed by RLS)
   */
  async getSchools(institutionId: string): Promise<School[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as School[]) || [];
  },

  /**
   * Create school campus with default class hierarchy via verified RPC
   */
  async createSchoolWithClasses(params: CreateSchoolWithClassesParams): Promise<CreateSchoolResult> {
    const { data, error } = await supabase.rpc('create_school_with_classes', {
      institution_id: params.institution_id,
      school_name: params.school_name,
      school_type: params.school_type,
      email: params.email,
      phone: params.phone,
      address: params.address,
      principal_name: params.principal_name,
      vice_principal_name: params.vice_principal_name,
      initial_classes: params.initial_classes,
    });

    if (error || !data) {
      // Direct table insert fallback if authorized
      const { data: newSchool, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          institution_id: params.institution_id,
          school_name: params.school_name,
          school_type: params.school_type,
          email: params.email,
          phone: params.phone,
          address: params.address,
          principal_name: params.principal_name,
          vice_principal_name: params.vice_principal_name,
          url_slug: params.school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        } as any)
        .select()
        .single();

      if (schoolErr || !newSchool) throw (schoolErr || new Error('Failed to create school'));
      const typedSchool = newSchool as School;

      // Seed initial classes
      const defaultClasses = params.initial_classes || ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
      const classInserts = defaultClasses.map(name => ({
        school_id: typedSchool.id,
        name,
        arm: 'Gold',
      }));

      const { data: createdClasses, error: classErr } = await supabase
        .from('classes')
        .insert(classInserts as any)
        .select();

      if (classErr) throw classErr;

      const typedClasses = (createdClasses as any[]) || [];

      return {
        school_id: typedSchool.id,
        institution_id: typedSchool.institution_id,
        school_name: typedSchool.school_name,
        classes_created_count: typedClasses.length,
        classes: typedClasses.map(c => ({ id: c.id, name: c.name })),
      };
    }

    return data as CreateSchoolResult;
  },

  /**
   * Update school logo or url slug
   */
  async updateSchoolIdentity(schoolId: string, logoUrl?: string, urlSlug?: string): Promise<School> {
    const updates: Record<string, any> = {};
    if (logoUrl !== undefined) updates.logo_url = logoUrl;
    if (urlSlug !== undefined) updates.url_slug = urlSlug;

    const { data, error } = await supabase
      .from('schools')
      .update(updates as any)
      .eq('id', schoolId)
      .select()
      .single();

    if (error || !data) throw (error || new Error('Failed to update school identity'));
    return data as School;
  },
};
