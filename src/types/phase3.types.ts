export interface ActivityItem {
  id: string;
  type: 'grading' | 'exam' | 'attendance' | 'payment' | 'system' | 'message';
  title: string;
  description: string;
  timestamp: string;
  status?: 'pending' | 'approved' | 'completed' | 'urgent' | 'info';
  user_name?: string;
  subject?: string;
  class_name?: string;
}

export interface AnomalyReport {
  id: string;
  type: 'grade_drop' | 'teacher_delay' | 'attendance_drop' | 'fee_issue';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_count: number;
  timestamp: string;
  class_name?: string;
  teacher_name?: string;
}

export interface ExamSchedule {
  id: string;
  title: string;
  subject_name: string;
  class_name: string;
  date?: string;
  time?: string;
  exam_date?: string;
  start_time?: string;
  duration_minutes?: number;
  total_students: number;
  status: 'upcoming' | 'ongoing' | 'completed' | string;
}

export interface TeacherDashboardStats {
  teacher_name: string;
  primary_class: string;
  total_students: number;
  pending_grades_count: number;
  absent_today_count: number;
  next_exam?: ExamSchedule | null;
  recent_activities: ActivityItem[];
}

export interface PrincipalDashboardStats {
  school_name: string;
  total_students: number;
  total_teachers: number;
  total_classes: number;
  attendance_rate: number;
  avg_score: number;
  anomalies_count: number;
  anomalies: AnomalyReport[];
  exam_schedule: ExamSchedule[];
  recent_teacher_activity: ActivityItem[];
}

export interface StudentDashboardStats {
  student_name: string;
  class_name: string;
  class_rank: number;
  total_students_in_class: number;
  practice_streak_days: number;
  subject_results: Array<{
    subject_name: string;
    score: number;
    grade: string;
  }>;
  active_exams: Array<{
    id: string;
    title: string;
    subject_name: string;
    time_remaining_minutes: number;
  }>;
}

export interface ParentDashboardStats {
  parent_name: string;
  ward_name: string;
  ward_class: string;
  ward_rank: number;
  attendance_rate: number;
  term_avg_score: number;
  fee_status: {
    total_due: number;
    amount_paid: number;
    outstanding_balance: number;
    status: 'paid' | 'partial' | 'overdue';
    due_date?: string;
  };
  recent_results: Array<{
    subject_name: string;
    score: number;
    grade: string;
  }>;
  upcoming_events: Array<{
    id: string;
    title: string;
    date: string;
  }>;
}

export interface BursarDashboardStats {
  school_name: string;
  revenue_today: number;
  total_outstanding_balance: number;
  collection_rate: number;
  reminders_sent_count: number;
  recent_transactions: Array<{
    id: string;
    student_name: string;
    class_name: string;
    amount: number;
    date: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
  outstanding_debtors: Array<{
    student_id: string;
    student_name: string;
    parent_name: string;
    parent_phone?: string;
    class_name: string;
    balance: number;
  }>;
}

export interface VPDashboardStats extends PrincipalDashboardStats {
  curriculum_progress: number;
  teacher_evaluations_pending: number;
}
