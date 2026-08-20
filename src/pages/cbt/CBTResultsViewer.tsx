import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CBTExam, ExamResult } from '../../types/phase4.types';
import { examAnalyticsService } from '../../services/examAnalyticsService';
import { DataTable, Column } from '../../components/dashboard/DataTable';
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  Award, 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  Users 
} from 'lucide-react';

export const CBTResultsViewer: React.FC = () => {
  const { examId } = useParams<{ examId?: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<CBTExam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [examId]);

  async function loadResults() {
    setLoading(true);
    const data = await examAnalyticsService.getExamResults(examId || 'ex_101');
    setExam(data.exam);
    setResults(data.results);
    setSummary(data.summary);
    setLoading(false);
  }

  const handleShareWhatsApp = (studentName: string, score: number, grade: string) => {
    const text = `CBT Result Notification: ${studentName} scored ${score}% (${grade}) in ${exam?.title}. SEFAES Verified.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const columns: Column<ExamResult>[] = [
    { key: 'position', header: 'Rank', sortable: true },
    { key: 'studentName', header: 'Student Name', sortable: true },
    {
      key: 'score',
      header: 'Score',
      render: (r) => <span className="font-mono font-bold">{r.score} / {r.maxScore} ({r.percentage}%)</span>,
      sortable: true,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (r) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
          {r.grade}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
            r.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button
          onClick={() => handleShareWhatsApp(r.studentName, r.score, r.grade)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Share2 className="w-3 h-3" />
          <span>Notify Parent</span>
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 md:p-8 font-sans max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/cbt/manager')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Exam Manager
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            📊 Exam Analytics: {exam?.title || 'Mathematics Exam'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {exam?.className} • {exam?.subjectName} • Administered on {exam?.examDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exporting PDF Results broadsheet...')}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Average</span>
          <p className="text-2xl font-extrabold text-indigo-600 font-mono">{summary?.averageScore || 72.4}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">{summary?.passRate || 85.7}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Score</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono">{summary?.topScore || 98}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Students</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">{summary?.totalStudents || 42}</p>
        </div>
      </div>

      {/* Grade Distribution Bar */}
      {summary?.gradeDistribution && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Grade Distribution Breakdown</h3>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {Object.entries(summary.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-900">{grade}</span>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{count as number} Students</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Results Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">🏆 Individual Student Results</h3>
        <DataTable columns={columns} data={results} loading={loading} />
      </div>
    </div>
  );
};
