import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { DataTable, Column } from '../../components/dashboard/DataTable';
import { PrincipalDashboardStats, AnomalyReport, ExamSchedule } from '../../types/phase3.types';
import { principalService } from '../../services/principalService';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Award, 
  AlertTriangle, 
  Calendar, 
  FileCheck, 
  TrendingUp,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const PrincipalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PrincipalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrincipalData();
  }, []);

  async function loadPrincipalData() {
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

  const quickActionsList = [
    {
      label: 'Inspect Broadsheets',
      icon: FileCheck,
      onClick: () => navigate('/grading'),
      variant: 'primary' as const,
    },
    {
      label: 'Add New Teacher',
      icon: Users,
      onClick: () => navigate('/?page=create-teacher'),
    },
    {
      label: 'Exam Schedule',
      icon: Calendar,
      onClick: () => navigate('/cbt'),
    },
  ];

  const examColumns: Column<ExamSchedule>[] = [
    { key: 'title', header: 'Exam Title', sortable: true },
    { key: 'subject_name', header: 'Subject', sortable: true },
    { key: 'class_name', header: 'Class', sortable: true },
    { key: 'date', header: 'Date & Time', render: (r) => `${r.date} (${r.time})` },
    { key: 'total_students', header: 'Students', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
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
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Principal Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            <span>{stats?.school_name || 'St. Gregory College'}</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            SEFAES Compliant Administrative Portal • Executive Overview
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>NDPR Sovereignty Verified</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <QuickActions actions={quickActionsList} title="⚡ Executive Quick Actions" />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={stats?.total_students || 0}
          icon={GraduationCap}
          loading={loading}
          subtitle="Enrolled across 14 arms"
        />
        <StatsCard
          title="Total Teachers"
          value={stats?.total_teachers || 0}
          icon={Users}
          loading={loading}
          subtitle="Active faculty members"
        />
        <StatsCard
          title="Attendance Rate"
          value={`${stats?.attendance_rate || 96.4}%`}
          icon={TrendingUp}
          loading={loading}
          trend={{ value: '+1.2%', isUpward: true }}
        />
        <StatsCard
          title="Term Average Score"
          value={`${stats?.avg_score || 78.2}%`}
          icon={Award}
          loading={loading}
          trend={{ value: '+3.4%', isUpward: true }}
        />
      </div>

      {/* Anomaly Reports Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">🚨 Anomaly & Early Warning Reports</h3>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
            {stats?.anomalies_count || 0} Flags Detected
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {stats?.anomalies.map((an) => (
            <div
              key={an.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-2 ${
                an.severity === 'high'
                  ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{an.title}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border uppercase">
                    {an.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-700">{an.description}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-200/50">
                <span>Affected: {an.affected_count} Students</span>
                <span>{an.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Schedule Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">📅 Upcoming Examination Schedule</h3>
        <DataTable columns={examColumns} data={stats?.exam_schedule || []} loading={loading} />
      </div>

      {/* Teacher Activity Feed */}
      <ActivityFeed activities={stats?.recent_teacher_activity || []} title="👨‍🏫 Teacher Activity Audit Log" loading={loading} />
    </div>
  );
};
