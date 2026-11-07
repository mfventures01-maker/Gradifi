import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock3, Loader2 } from 'lucide-react';
import { cbtService } from '../../services/cbtService';

type EligibleExam = Awaited<ReturnType<typeof cbtService.getEligibleExams>>[number];

export const CBTCandidateExamListPage: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<EligibleExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    cbtService.getEligibleExams()
      .then(rows => { if (alive) setExams(rows); })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Unable to load eligible examinations'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-7 max-w-5xl mx-auto space-y-5">
      <header className="bg-slate-950 text-white rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Gradifi CBT</p>
        <h1 className="text-2xl font-extrabold mt-2">Your eligible examinations</h1>
        <p className="text-sm text-slate-300 mt-2">Only examinations authorized for your student identity are shown.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="bg-white rounded-2xl p-10 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Loading eligible exams…</div> :
        exams.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
          <BookOpen size={28} className="mx-auto text-slate-400" />
          <h2 className="font-bold">No eligible examinations right now</h2>
          <p className="text-sm text-slate-500">Your school has not assigned a published examination to your class, or its scheduled window has not opened.</p>
          <button onClick={() => navigate('/cbt/public')} className="mt-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold">Browse public examinations</button>
        </div> :
        <section className="grid md:grid-cols-2 gap-4">
          {exams.map(exam => (
            <article key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div><h2 className="font-bold text-lg">{exam.title}</h2>{exam.description && <p className="text-sm text-slate-500 mt-1">{exam.description}</p>}</div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock3 size={14} /> {exam.duration_minutes} minutes</span>
                <span>{exam.total_marks} marks</span>
              </div>
              {exam.start_time && <p className="text-xs text-slate-500">Scheduled: {new Date(exam.start_time).toLocaleString()}</p>}
              <button onClick={() => navigate('/cbt/runner/' + exam.id)} className="w-full rounded-lg bg-indigo-600 text-white py-3 text-sm font-bold">Start examination</button>
            </article>
          ))}
        </section>}
    </main>
  );
};
