import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Lock, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cbtService, CbtPublicOffer } from '../../services/cbtService';
import { cbtPaymentService } from '../../services/cbtPaymentService';

const money = (minor: number, currency: string) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(minor / 100);

export const PublicCbtMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<CbtPublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    cbtService.getPublicOffers()
      .then(rows => { if (alive) setOffers(rows); })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Marketplace is unavailable'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const purchase = async (offer: CbtPublicOffer) => {
    setError('');
    setBuying(offer.offer_id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/cbt/public/auth?offer=' + encodeURIComponent(offer.offer_id));
        return;
      }
      await cbtService.registerPublicCandidate(
        String(user.user_metadata?.first_name || ''),
        String(user.user_metadata?.last_name || ''),
      );
      const checkout = await cbtPaymentService.initialize(offer.offer_id);
      if (checkout.already_entitled || checkout.free) {
        navigate('/cbt/runner/' + offer.exam_id);
      } else if (checkout.authorization_url) {
        window.location.assign(checkout.authorization_url);
      } else {
        throw new Error('Payment provider did not return a checkout URL.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start checkout');
    } finally {
      setBuying('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white px-5 py-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Gradifi CBT</p>
            <h1 className="text-3xl font-extrabold mt-2">Public examination marketplace</h1>
            <p className="text-sm text-slate-300 mt-2">Discover, purchase and sit verified examinations from participating schools.</p>
          </div>
          <button onClick={() => navigate('/cbt/public/auth?mode=login')} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <Lock size={15} /> Candidate sign in
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto p-5 sm:p-7 space-y-5">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {loading ? <div className="bg-white rounded-2xl p-10 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Loading published offers…</div> :
          offers.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
            <BookOpen size={28} className="mx-auto text-slate-400" />
            <h2 className="font-bold text-lg">No public examinations listed yet</h2>
            <p className="text-sm text-slate-500">Published exams become available here when a participating school creates a public offer.</p>
          </div> :
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {offers.map(offer => (
              <article key={offer.offer_id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-indigo-600">{offer.school_name}</p>
                  <h2 className="font-extrabold text-lg mt-1">{offer.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{offer.subject_name} · {offer.class_name}</p>
                  {offer.description && <p className="text-sm text-slate-600 mt-3">{offer.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>{offer.duration_minutes} minutes</span><span>{offer.total_marks} marks</span>
                  {offer.start_time && <span className="col-span-2">Starts {new Date(offer.start_time).toLocaleString()}</span>}
                </div>
                <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                  <strong className="text-xl">{money(offer.price_minor, offer.currency)}</strong>
                  <button disabled={buying === offer.offer_id} onClick={() => void purchase(offer)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                    {buying === offer.offer_id ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
                    {offer.price_minor === 0 ? 'Start free' : 'Purchase'}
                  </button>
                </div>
              </article>
            ))}
          </div>}
      </section>
    </main>
  );
};
