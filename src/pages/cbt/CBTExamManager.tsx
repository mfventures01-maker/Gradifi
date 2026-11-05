import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, BookOpen, Globe, Plus, RefreshCw, Search, X } from 'lucide-react';
import { authService } from '../../services/authService';
import { cbtService, CbtExamRecord, CbtPublicOffer } from '../../services/cbtService';

export const CBTExamManager: React.FC = () => {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState('');
  const [exams, setExams] = useState<CbtExamRecord[]>([]);
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<CbtPublicOffer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerExam, setOfferExam] = useState<CbtExamRecord | null>(null);
  const [priceNaira, setPriceNaira] = useState('0');
  const [savingOffer, setSavingOffer] = useState(false);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const identity = await authService.resolveCurrentIdentity();
      if (!identity.schoolId) throw new Error('Your account is not linked to an active school.');
      setSchoolId(identity.schoolId);
      const [examRows, catalog, publicOffers] = await Promise.all([
        cbtService.getExams(identity.schoolId),
        cbtService.getAuthoringCatalog(identity.schoolId),
        cbtService.getPublicOffers(),
      ]);
      setExams(examRows);
      setOffers(publicOffers);
      setClasses(Object.fromEntries(catalog.classes.map(row => [row.id, row.name])));
      setSubjects(Object.fromEntries(catalog.subjects.map(row => [row.id, row.name])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load CBT exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => exams.filter(exam => {
    const matchesSearch = (exam.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || (exam.status || 'draft') === status;
    return matchesSearch && matchesStatus;
  }), [exams, search, status]);

  const openOffer = (exam: CbtExamRecord) => {
    const current = offers.find(offer => offer.exam_id === exam.id);
    setOfferExam(exam);
    setPriceNaira(current ? String(current.price_minor / 100) : '0');
  };

  const saveOffer = async () => {
    if (!offerExam) return;
    const amount = Number(priceNaira);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid non-negative price in naira.');
      return;
    }
    setSavingOffer(true);
    setError('');
    try {
      await cbtService.createPublicOffer({
        examId: offerExam.id,
        priceMinor: Math.round(amount * 100),
        currency: 'NGN',
        listed: true,
      });
      setOfferExam(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create public offer');
    } finally {
      setSavingOffer(false);
    }
  };

  const hideOffer = async (exam: CbtExamRecord) => {
    const current = offers.find(offer => offer.exam_id === exam.id);
    if (!current) return;
    try {
      await cbtService.createPublicOffer({
        examId: exam.id, priceMinor: current.price_minor, currency: current.currency, listed: false,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove public listing');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-7 max-w-6xl mx-auto space-y-5">
      <header className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">CBT Examination Manager</h1>
          <p className="text-sm text-slate-500">School examinations and public exam listings share the same CBT engine.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/cbt/public')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold flex items-center gap-2">
            <Globe size={16} /> Public marketplace
          </button>
          <button onClick={() => navigate('/cbt/builder')} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> Create exam
          </button>
          <button onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white p-2" aria-label="Refresh exams">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search exams by title" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-slate-300 p-2 text-sm">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </section>

      {loading ? <div className="bg-white rounded-2xl p-8 text-center text-slate-500">Loading school exams…</div> :
        filtered.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No exams match this view. Create your first exam to begin.</div> :
        <section className="grid md:grid-cols-2 gap-4">
          {filtered.map(exam => {
            const publicOffer = offers.find(offer => offer.exam_id === exam.id);
            return (
              <article key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-lg">{exam.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">{subjects[exam.subject_id] || 'Subject'} · {classes[exam.class_id] || 'Class'}</p>
                  </div>
                  <span className={'text-[11px] font-bold uppercase rounded-full px-2.5 py-1 ' + (exam.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                    {exam.status || 'draft'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{exam.duration_minutes}</div><div className="text-[10px] text-slate-500">Minutes</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{exam.total_marks}</div><div className="text-[10px] text-slate-500">Marks</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{exam.pass_mark ?? 0}</div><div className="text-[10px] text-slate-500">Pass mark</div></div>
                </div>
                {exam.start_time && <p className="text-xs text-slate-500">Scheduled: {new Date(exam.start_time).toLocaleString()}</p>}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {exam.status === 'draft' && <button onClick={() => navigate('/cbt/builder/' + exam.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Edit draft</button>}
                  {exam.status === 'published' && <button onClick={() => navigate('/cbt/results/' + exam.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold flex items-center gap-1"><BarChart2 size={14} /> Results</button>}
                  {exam.status === 'published' && !publicOffer && <button onClick={() => openOffer(exam)} className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-1"><Globe size={14} /> List publicly</button>}
                  {exam.status === 'published' && publicOffer && <>
                    <span className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-bold">Public · {(publicOffer.price_minor / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</span>
                    <button onClick={() => openOffer(exam)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Edit price</button>
                    <button onClick={() => void hideOffer(exam)} className="rounded-lg border border-rose-200 text-rose-700 px-3 py-2 text-xs font-bold">Unlist</button>
                  </>}
                </div>
              </article>
            );
          })}
        </section>
      }

      {offerExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 grid place-items-center p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="public-offer-title" className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
            <div className="flex justify-between items-center gap-3">
              <h2 id="public-offer-title" className="font-bold text-lg">Public exam price</h2>
              <button onClick={() => setOfferExam(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600">{offerExam.title}</p>
            <label className="block text-sm">Price in naira
              <input type="number" min="0" step="0.01" value={priceNaira} onChange={event => setPriceNaira(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
            </label>
            <p className="text-xs text-slate-500">The server stores the amount in kobo and determines the checkout amount. Enter 0 for a free offer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOfferExam(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
              <button disabled={savingOffer} onClick={() => void saveOffer()} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold disabled:opacity-50">
                {savingOffer ? 'Saving…' : 'Save listing'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
