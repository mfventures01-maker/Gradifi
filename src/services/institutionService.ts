/**
 * GRADIFI x SEFAES - INSTITUTION SERVICE
 * Canonical SSoT interaction with institutions and institution_health_metrics.
 */

import { supabase } from '../lib/supabase';
import { Institution, InstitutionHealthMetrics } from '../contracts/schema';
import { CreateInstitutionAccountParams, CreateInstitutionAccountResult } from '../contracts/rpc';

export const institutionService = {
  /**
   * Create institution account via verified RPC
   */
  async createInstitutionAccount(params: CreateInstitutionAccountParams): Promise<CreateInstitutionAccountResult> {
    const { data, error } = await supabase.rpc('create_institution_account', {
      name: params.name,
      type: params.type,
      country: params.country,
    });

    if (error || !data) {
      // Direct table insert fallback if authorized
      const { data: directData, error: directError } = await supabase
        .from('institutions')
        .insert({
          name: params.name,
          type: params.type,
          country: params.country,
        } as any)
        .select()
        .single();

      if (directError || !directData) throw (directError || new Error('Failed to create institution'));
      const inst = directData as Institution;
      return {
        institution_id: inst.id,
        name: inst.name,
        type: inst.type,
        country: inst.country,
        created_at: inst.created_at,
      };
    }

    return data as CreateInstitutionAccountResult;
  },

  /**
   * Get institution by ID
   */
  async getInstitution(id: string): Promise<Institution | null> {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as Institution) || null;
  },

  /**
   * Get canonical institutional health metrics computed by backend triggers
   */
  async getHealthMetrics(institutionId: string): Promise<InstitutionHealthMetrics | null> {
    const { data, error } = await supabase
      .from('institution_health_metrics')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch institution_health_metrics:", error.message);
      return null;
    }
    return (data as InstitutionHealthMetrics) || null;
  },
};
