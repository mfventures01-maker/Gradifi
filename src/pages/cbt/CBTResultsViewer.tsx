import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Trophy } from 'lucide-react';
import { cbtService, CbtExamResults } from '../../services/cbtService';

export const CBTResultsViewer: React.FC = () => {
  const navigate = useNavigate();
  const { examId = '' } = useParams<{ examId: string }>();
  const [report, setReport] = useState<CbtExamResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    cbtService.getExamResults(examId)
      .then(data => { if (alive) setReport(data); })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Unable to retrieve examination results'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [examId]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Position', 'Student', 'Student ID', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Status', 'Submitted At'],
      ...report.results.map(row => [
        row.position, row.studentName, row.studentId, String(row.score), String(row.maxScore),
        String(row.percentage), row.grade, row.status, row.submittedAt || '',
      ]),
    ];
    const csv = rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cbt-results-' + examId + '.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Loading certified results…</div>;
  if (error) return <main className="min-h-screen grid place-items-center p-5 bg-slate-50"><section className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl p-6 space-y-3"><h1 className="font-bold text-xl">Results unavailable</h1><p className="text-sm text-rose-700">{error}</p><button onClick={() => navigate('/cbt/manager')} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm">Back to manager</button></section></main>;
  if (!report) return null;

  const { exam, summary, results } = report;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-7 max-w-6xl mx-auto space-y-5">
      <header className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/cbt/manager')} className="text-xs text-slate-500 flex items-center gap-2 mb-2"><ArrowLeft size={14} /> Exam manager</button>
          <h1 className="text-2xl font-extrabold">{exam.title}</h1>
          <p className="text-sm text-slate-500">{exam.subjectName} · {exam.className} · {exam.totalMarks} marks</p>
        </div>
        <button onClick={exportCsv} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2"><Download size={15} /> Export CSV</button>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Candidates', summary.totalStudents],
          ['Average score', summary.averageScore.toFixed(1) + '%'],
          ['Pass rate', summary.passRate.toFixed(1) + '%'],
          ['Highest score', summary.topScore.toFixed(1) + '%'],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-extrabold mt-1">{value}</div>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /><h2 className="font-bold">Candidate results</h2></div>
        {results.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No submitted attempts have results yet.</div> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr><th className="text-left p-3">Position</th><th className="text-left p-3">Candidate</th><th className="text-left p-3">Score</th><th className="text-left p-3">Percentage</th><th className="text-left p-3">Grade</th><th className="text-left p-3">Status</th><th className="text-left p-3">Submitted</th></tr>
              </thead>
              <tbody>
                {results.map(row => <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-3 font-bold">{row.position}</td>
                  <td className="p-3"><div className="font-semibold">{row.studentName}</div><div className="text-[11px] text-slate-400">{row.studentId}</div></td>
                  <td className="p-3 tabular-nums">{row.score}/{row.maxScore}</td>
                  <td className="p-3 tabular-nums">{row.percentage.toFixed(1)}%</td>
                  <td className="p-3 font-bold">{row.grade}</td>
                  <td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-bold ' + (row.status === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{row.status}</span></td>
                  <td className="p-3 text-xs text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>
    </main>
  );
};
