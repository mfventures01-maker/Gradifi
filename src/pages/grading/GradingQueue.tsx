import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScriptItem } from '../../types/phase4.types';
import { gradingQueueService } from '../../services/gradingQueueService';
import { ConfidenceIndicator } from '../../components/grading/ConfidenceIndicator';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileText 
} from 'lucide-react';

export const GradingQueue: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    const data = await gradingQueueService.getPendingQueue();
    setQueue(data);
    setLoading(false);
  }

  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subjectName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const completedCount = queue.filter((i) => i.status === 'completed' || i.status === 'overridden').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/portal/teacher')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Teacher Dashboard
          </button>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Rubric Draft Engine
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare className="w-7 h-7 text-indigo-600" />
              <span>AI Grading Review Queue</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Review, tweak, and approve AI-drafted rubric scores before broadsheet release.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full">
              Pending: {pendingCount}
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full">
              Completed: {completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="completed">Approved / Completed</option>
          </select>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3.5">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-3 bg-slate-100 rounded-md" />
            </div>
          ))
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Queue Clear!</h3>
            <p className="text-xs text-slate-500">No pending AI essay drafts require review right now.</p>
          </div>
        ) : (
          filteredQueue.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {item.subjectName} • {item.className}
                  </span>
                  <span className="text-xs text-slate-400">• {item.submittedAt}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.assignmentTitle}</h3>
                <p className="text-xs font-semibold text-slate-700">Student: {item.studentName}</p>
              </div>

              <div className="flex items-center gap-5 sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-sm font-extrabold text-slate-900 font-mono">
                    AI Score: {item.aiScore}/{item.maxScore}
                  </div>
                  <div className="mt-1">
                    <ConfidenceIndicator confidence={item.confidence} size="sm" showLabel={false} />
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/grading/review/${item.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors cursor-pointer shrink-0"
                >
                  <span>Review & Approve</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
