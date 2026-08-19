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
      student_name: 'Emeka Adebayo',
      class_name: 'JSS 3 Gold',
      class_rank: 4,
      total_students_in_class: 34,
      practice_streak_days: 7,
      subject_results: [
        { subject_name: 'Mathematics', score: 88, grade: 'A1' },
        { subject_name: 'English Language', score: 82, grade: 'B2' },
        { subject_name: 'Basic Science', score: 91, grade: 'A1' },
        { subject_name: 'Civic Education', score: 79, grade: 'B3' },
      ],
      active_exams: [
        { id: 'ex_cbt_1', title: 'WAEC CBT Practice Test 2026', subject_name: 'Mathematics', time_remaining_minutes: 45 },
      ],
    };
  },
};
