import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { DataTable, Column } from '../../components/dashboard/DataTable';
import { PrincipalDashboardStats, ExamSchedule } from '../../types/phase3.types';
import { principalService } from '../../services/principalService';
import { 
  GraduationCap, 
  Users, 
  Award, 
  AlertTriangle, 
  Calendar, 
  ArrowLeft, 
  BookOpen
} from 'lucide-react';

export const VPDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PrincipalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVPData();
  }, []);

  async function loadVPData() {
    setLoading(true);
    try {
      const data = await principalService.getDashboardStats();
      setStats(data);
    } catch {
      setStats(principalService.getFallbackStats());
    } finally {
      setLoading(false);
    }
  }

  const examColumns: Column<ExamSchedule>[] = [
    { key: 'title', header: 'Exam Title', sortable: true },
    { key: 'subject_name', header: 'Subject', sortable: true },
    { key: 'class_name', header: 'Class', sortable: true },
    { key: 'date', header: 'Date & Time', render: (r) => `${r.date} (${r.time})` },
    { key: 'total_students', header: 'Students', sortable: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
      {/* Header */}
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
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">VP Academics Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            <span>Academic Supervision & Curriculum</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            {stats?.school_name || 'St. Gregory College'} • Teacher Evaluation & Exam Schedules
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Classes"
          value={stats?.total_classes || 14}
          icon={GraduationCap}
          loading={loading}
        />
        <StatsCard
          title="Curriculum Progress"
          value="94.2%"
          icon={Award}
          loading={loading}
          trend={{ value: '+2.1%', isUpward: true }}
        />
        <StatsCard
          title="Attendance Rate"
          value={`${stats?.attendance_rate || 96.4}%`}
          icon={Users}
          loading={loading}
        />
        <StatsCard
          title="Anomalies Flagged"
          value={stats?.anomalies_count || 2}
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      {/* Anomaly & Early Warning */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">🚨 Academic Anomaly & Class Drop Reports</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {stats?.anomalies.map((an) => (
            <div key={an.id} className="p-4 rounded-xl border bg-amber-50/60 border-amber-200 text-amber-950 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider">{an.title}</span>
              <p className="text-xs text-slate-700">{an.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">📅 Academic Exam Schedule</h3>
        <DataTable columns={examColumns} data={stats?.exam_schedule || []} loading={loading} />
      </div>

      {/* Teacher Activity */}
      <ActivityFeed activities={stats?.recent_teacher_activity || []} title="👨‍🏫 Faculty Activity Audit Log" loading={loading} />
    </div>
  );
};
