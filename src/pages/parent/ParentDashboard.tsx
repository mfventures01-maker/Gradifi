import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  User, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Clock,
  Calendar,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Eye
} from 'lucide-react';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';

interface WardData {
  student_id: string;
  student_name: string;
  student_number: string;
  class_name: string;
  class_rank: number;
  total_students_in_class: number;
  attendance_rate: number;
  term_avg_score: number;
}

interface ParentDashboardData {
  parent_name: string;
  wards: WardData[];
  total_wards: number;
}

const DEFAULT_PARENT_DATA: ParentDashboardData = {
  parent_name: 'Mrs. Funke Adebayo',
  total_wards: 1,
  wards: [
    {
      student_id: 'std_demo_01',
      student_name: 'Chidi Okeke',
      student_number: 'GRD/2026/1001',
      class_name: 'JSS 1',
      class_rank: 3,
      total_students_in_class: 35,
      attendance_rate: 94.5,
      term_avg_score: 78.2
    }
  ]
};

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
          setData(DEFAULT_PARENT_DATA);
          setLoading(false);
          return;
        }

        // Get parent profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.user.id)
          .eq('role', 'parent')
          .single();

        if (!profile) {
          setData(DEFAULT_PARENT_DATA);
          setLoading(false);
          return;
        }

        const { data: stats, error } = await supabase.rpc('get_parent_dashboard_stats', {
          p_parent_id: profile.id
        });

        if (error || !stats) throw error || new Error('No data returned');
        setData(stats);
      } catch (err) {
        console.warn('Parent dashboard load fallback:', err);
        setData(DEFAULT_PARENT_DATA);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto" />
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="font-semibold text-slate-800">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const mainWard = data.wards && data.wards.length > 0 ? data.wards[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back Home
              </button>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-amber-600" />
                <span>Welcome, {data.parent_name}</span>
              </h1>
              <p className="text-sm text-slate-500">
                {data.total_wards} {data.total_wards === 1 ? 'ward' : 'wards'} enrolled
              </p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-800">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Parent Portal</span>
            </div>
          </div>
        </div>

        {/* Ward Cards */}
        {data.wards && data.wards.map((ward, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  {ward.student_name}
                </h2>
                <p className="text-sm text-slate-500">
                  {ward.class_name} • {ward.student_number}
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                Rank #{ward.class_rank}/{ward.total_students_in_class}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{ward.term_avg_score}%</p>
                <p className="text-xs text-slate-500">Term Average</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{ward.attendance_rate}%</p>
                <p className="text-xs text-slate-500">Attendance</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-900">#{ward.class_rank}</p>
                <p className="text-xs text-slate-500">Class Rank</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{ward.total_students_in_class}</p>
                <p className="text-xs text-slate-500">Total in Class</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4" />
                View Results
              </button>
              <button className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-100 transition-colors">
                <MessageCircle className="w-4 h-4" />
                Contact Teacher
              </button>
              <button className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-amber-100 transition-colors">
                <DollarSign className="w-4 h-4" />
                Fee Status
              </button>
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
              <Calendar className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-600">School Calendar</p>
            </button>
            <button className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
              <MessageCircle className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-600">Messages</p>
            </button>
            <button className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
              <Eye className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-600">Report Cards</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
