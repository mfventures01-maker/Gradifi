import { supabase } from '../lib/supabase';
import { ParentDashboardStats } from '../types/phase3.types';

export const parentService = {
  async getDashboardStats(parentId?: string): Promise<ParentDashboardStats> {
    try {
      const { data, error } = await supabase.rpc('get_parent_dashboard_stats' as any, {
        p_parent_id: parentId || null,
      });

      if (error || !data) {
        console.warn('RPC get_parent_dashboard_stats fallback:', error?.message);
        return this.getFallbackStats();
      }

      return data as unknown as ParentDashboardStats;
    } catch (err) {
      console.warn('parentService error:', err);
      return this.getFallbackStats();
    }
  },

  async getWardPerformance(wardId?: string) {
    try {
      const { data } = await supabase.rpc('get_student_results' as any, { p_student_id: wardId || null });
      return data;
    } catch {
      return null;
    }
  },

  async getFeeStatus(parentId?: string) {
    const stats = await this.getDashboardStats(parentId);
    return stats.fee_status;
  },

  async getUpcomingEvents(parentId?: string) {
    const stats = await this.getDashboardStats(parentId);
    return stats.upcoming_events;
  },

  getFallbackStats(): ParentDashboardStats {
    return {
      parent_name: 'Parent',
      ward_name: 'Student',
      ward_class: 'No Class',
      ward_rank: 0,
      attendance_rate: 0,
      term_avg_score: 0,
      fee_status: {
        total_due: 0,
        amount_paid: 0,
        outstanding_balance: 0,
        status: 'paid',
        due_date: '',
      },
      recent_results: [],
      upcoming_events: [],
    };
  },
};
