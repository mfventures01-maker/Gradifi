import { supabase } from '../lib/supabase';
import { StudentDashboardStats } from '../types/phase3.types';

export const studentDashboardService = {
  async getDashboardStats(studentId?: string): Promise<StudentDashboardStats> {
    try {
      const { data, error } = await supabase.rpc('get_student_dashboard_stats' as any, {
        p_student_id: studentId || null,
      });

      if (error || !data) {
        return this.getFallbackStats();
      }

      return data as unknown as StudentDashboardStats;
    } catch {
      return this.getFallbackStats();
    }
  },

  getFallbackStats(): StudentDashboardStats {
    return {
      student_name: 'Student',
      class_name: 'No Class',
      class_rank: 0,
      total_students_in_class: 0,
      practice_streak_days: 0,
      subject_results: [],
      active_exams: [],
    };
  },
};
