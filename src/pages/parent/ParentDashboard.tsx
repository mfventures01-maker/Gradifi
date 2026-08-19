import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParentDashboardStats } from '../../types/phase3.types';
import { parentService } from '../../services/parentService';
import { 
  Share2, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  Award, 
  ArrowLeft, 
  Sparkles,
  PhoneCall
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ParentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParentData();
  }, []);

  async function loadParentData() {
    setLoading(true);
    try {
      const data = await parentService.getDashboardStats();
      setStats(data);
    } catch {
      setStats(parentService.getFallbackStats());
    } finally {
      setLoading(false);
    }
  }

  const handleShareWhatsApp = () => {
    const text = `Report Card for ${stats?.ward_name} (${stats?.ward_class}): Term Average: ${stats?.term_avg_score}%, Class Rank: #${stats?.ward_rank}. SEFAES Verified.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 font-sans max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Home
          </button>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Parent Access Portal
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              👋 Welcome, {stats?.parent_name || 'Parent'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Ward: <strong className="text-slate-800">{stats?.ward_name}</strong> ({stats?.ward_class})
            </p>
          </div>

          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Broadsheet via WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Report Card Highlight Above The Fold */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl border border-indigo-700/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">
              Official Term Report Card Summary
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white mt-1">
              {stats?.term_avg_score}% <span className="text-base font-semibold text-indigo-200">Average</span>
            </h2>
            <p className="text-xs text-indigo-200 mt-1">
              Class Rank: <strong className="text-white">#{stats?.ward_rank}</strong> • Attendance: <strong className="text-emerald-400">{stats?.attendance_rate}%</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-indigo-950/60 p-3 rounded-2xl border border-indigo-700/50">
            <Award className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-100">SEFAES Verified</p>
              <p className="text-[10px] text-indigo-300">Signed by School Principal</p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-indigo-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats?.recent_results.map((res, i) => (
            <div key={i} className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <p className="text-[10px] text-indigo-200 font-medium truncate">{res.subject_name}</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {res.score}% <span className="text-xs text-emerald-400 font-mono">({res.grade})</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Status */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>School Fees Status</span>
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              stats?.fee_status.status === 'paid'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {stats?.fee_status.status === 'paid' ? 'Fully Paid' : 'Payment Due'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-medium pt-2 border-t border-slate-100">
          <span className="text-slate-500">Total Term Fees:</span>
          <span className="font-bold text-slate-900">₦{stats?.fee_status.total_due.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-500">Outstanding Balance:</span>
          <span className="font-bold text-emerald-600">₦{stats?.fee_status.outstanding_balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>School Calendar & Events</span>
        </h3>
        <div className="space-y-2">
          {stats?.upcoming_events.map((ev) => (
            <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-800 font-bold">{ev.title}</span>
              <span className="text-slate-500 text-[11px]">{ev.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
