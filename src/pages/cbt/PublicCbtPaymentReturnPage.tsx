import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cbtPaymentService } from '../../services/cbtPaymentService';

export const PublicCbtPaymentReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Verifying your payment with the payment provider…');

  useEffect(() => {
    let alive = true;
    if (!reference) {
      setError('Payment reference is missing.');
      return;
    }
    cbtPaymentService.verify(reference)
      .then(result => {
        if (!alive) return;
        setStatus('Payment verified. Opening your examination…');
        navigate('/cbt/runner/' + result.exam_id, { replace: true });
      })
      .catch(cause => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Payment could not be verified.');
      });
    return () => { alive = false; };
  }, [reference, navigate]);

  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center p-5">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-7 text-center space-y-3">
        {error ? <AlertCircle size={30} className="mx-auto text-rose-600" /> : <Loader2 size={30} className="mx-auto animate-spin text-indigo-600" />}
        <h1 className="text-xl font-extrabold">{error ? 'Payment verification pending' : 'Verifying payment'}</h1>
        <p className="text-sm text-slate-600">{error || status}</p>
        {error && <button onClick={() => navigate('/cbt/public')} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm">Return to marketplace</button>}
      </section>
    </main>
  );
};
