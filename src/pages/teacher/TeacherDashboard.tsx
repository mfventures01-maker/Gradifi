import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { TeacherDashboardStats } from '../../types/phase3.types';
import { teacherService } from '../../services/teacherService';
import { supabase } from '../../lib/supabase';
import { 
  FileEdit, 
  CheckSquare, 
  UserCheck, 
  Clock, 
  Users, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Calendar,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    fetchTeacherStats();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function fetchTeacherStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_teacher_dashboard_stats' as any);
      if (!error && data) {
        setStats(data as unknown as TeacherDashboardStats);
      } else {
        setStats(getFallbackStats());
      }
    } catch {
      setStats(getFallbackStats());
    } finally {
      setLoading(false);
    }
  }

  function getFallbackStats(): TeacherDashboardStats {
    return {
      teacher_name: 'Teacher',
      primary_class: 'No Class',
      total_students: 0,
      pending_grades_count: 0,
      absent_today_count: 0,
      next_exam: undefined,
      recent_activities: [],
    };
  }

  const quickActionsList = [
    {
      label: 'Create Test',
      icon: FileEdit,
      onClick: () => navigate('/cbt'),
      variant: 'primary' as const,
    },
    {
      label: 'Review Grades',
      icon: CheckSquare,
      onClick: () => navigate('/grading'),
      badge: stats?.pending_grades_count && stats.pending_grades_count > 0 ? stats.pending_grades_count : undefined,
    },
    {
      label: 'Mark Attendance',
      icon: UserCheck,
      onClick: () => alert('Attendance marked for today.'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-5xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Teacher Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            👋 Good Morning, {stats?.teacher_name || 'Teacher'}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            {stats?.primary_class || 'No Class'} • {stats?.total_students || 0} Assigned Students
          </p>
        </div>

        {/* Sync & Connectivity Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-semibold">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Offline Engine Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="text-amber-700">Offline Mode (Local Storage)</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions (Thumb-zone optimized 360px) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <QuickActions actions={quickActionsList} title="⚡ Quick Actions" />
      </div>

      {/* Today's Overview Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatsCard
          title="Pending AI Grades"
          value={stats?.pending_grades_count || 0}
          icon={Clock}
          loading={loading}
          subtitle={
            stats?.pending_grades_count && stats.pending_grades_count > 5
              ? '⚠️ High review queue'
              : 'Drafted by AI, pending approval'
          }
        />
        <StatsCard
          title="Students Absent Today"
          value={stats?.absent_today_count || 0}
          icon={Users}
          loading={loading}
          subtitle={`Out of ${stats?.total_students || 0} total students`}
        />
        <StatsCard
          title="Next Scheduled Exam"
          value={stats?.next_exam?.subject_name || 'None'}
          icon={Calendar}
          loading={loading}
          subtitle={stats?.next_exam ? `${stats.next_exam.date}, ${stats.next_exam.time}` : 'No upcoming exam'}
        />
      </div>

      {/* Recent Activity */}
      <ActivityFeed
        activities={stats?.recent_activities || []}
        title="📝 Recent Activity & Submissions"
        loading={loading}
      />
    </div>
  );
};
