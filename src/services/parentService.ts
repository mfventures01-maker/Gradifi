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
      parent_name: 'Mrs. Funke Adebayo',
      ward_name: 'Emeka Adebayo',
      ward_class: 'JSS 3 Gold',
      ward_rank: 4,
      attendance_rate: 98.2,
      term_avg_score: 85.0,
      fee_status: {
        total_due: 150000,
        amount_paid: 150000,
        outstanding_balance: 0,
        status: 'paid',
        due_date: '2026-09-30',
      },
      recent_results: [
        { subject_name: 'Mathematics Mid-Term', score: 88, grade: 'A1' },
        { subject_name: 'English Essay #3', score: 82, grade: 'B2' },
        { subject_name: 'Basic Science Quiz #4', score: 91, grade: 'A1' },
      ],
      upcoming_events: [
        { id: 'ev_1', title: 'PTA General Assembly & Broadsheet Review', date: 'Next Friday 4:00 PM' },
        { id: 'ev_2', title: 'WAEC CBT Practice Simulation', date: 'Next Monday 9:00 AM' },
      ],
    };
  },
};
