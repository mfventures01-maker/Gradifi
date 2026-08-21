import { supabase } from '../lib/supabase';

export const vpService = {
  async getDashboardStats(schoolId?: string) {
    const { data, error } = await supabase.rpc('get_vp_dashboard_stats', {
      p_school_id: schoolId || null
    });
    if (error) throw error;
    return data;
  }
};
