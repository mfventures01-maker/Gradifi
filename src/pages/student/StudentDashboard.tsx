import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentDashboardStats } from '../../types/phase3.types';
import { studentDashboardService } from '../../services/studentDashboardService';
import { 
  Flame, 
  Award, 
  BookOpen, 
  Clock, 
  ArrowLeft, 
  Play, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  async function loadStudentData() {
    setLoading(true);
    try {
      const data = await studentDashboardService.getDashboardStats();
      setStats(data);
    } catch {
      setStats(studentDashboardService.getFallbackStats());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 font-sans max-w-md mx-auto space-y-5">
      {/* Top Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Home
          </button>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            Student Portal
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            👋 Welcome, {stats?.student_name || 'Student'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {stats?.class_name || 'Class'} • Class Rank:{' '}
            <strong className="text-slate-800">
              #{stats?.class_rank || 1}/{stats?.total_students_in_class || 34}
            </strong>
          </p>
        </div>

        {/* Practice Streak Banner */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl flex items-center justify-between shadow-md shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-amber-100 fill-amber-100 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold">{stats?.practice_streak_days || 7}-Day Practice Streak!</h4>
              <p className="text-[11px] text-amber-100">Keep solving daily CBT questions to earn badges</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active CBT Exams Above the Fold */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Active Exams Available</span>
          </h3>
        </div>

        {stats?.active_exams.map((ex) => (
          <div
            key={ex.id}
            className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                {ex.subject_name}
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5">{ex.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">⏱️ {ex.time_remaining_minutes} min duration</p>
            </div>
            <button
              onClick={() => navigate('/cbt')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Start</span>
              <Play className="w-3.5 h-3.5 fill-white" />
            </button>
          </div>
        ))}
      </div>

      {/* Results Breakdown */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>My Term Performance</span>
          </h3>
        </div>

        <div className="space-y-2.5">
          {stats?.subject_results.map((sub, i) => (
            <div
              key={i}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-white text-indigo-600 border rounded-lg flex items-center justify-center text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">{sub.subject_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-600">{sub.score}%</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  {sub.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
