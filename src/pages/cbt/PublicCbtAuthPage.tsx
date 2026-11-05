import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cbtService } from '../../services/cbtService';
import { cbtPaymentService } from '../../services/cbtPaymentService';

export const PublicCbtAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const offerId = params.get('offer') || '';
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const continueAfterAuth = async (user: { user_metadata?: Record<string, unknown> }) => {
    await cbtService.registerPublicCandidate(
      firstName || String(user.user_metadata?.first_name || ''),
      lastName || String(user.user_metadata?.last_name || ''),
    );
    if (offerId) {
      const checkout = await cbtPaymentService.initialize(offerId);
      if (checkout.already_entitled || checkout.free) {
        navigate('/cbt/runner/' + checkout.exam_id, { replace: true });
      } else if (checkout.authorization_url) {
        window.location.assign(checkout.authorization_url);
      } else {
        throw new Error('Payment provider did not return a checkout URL.');
      }
    } else {
      navigate('/cbt/public', { replace: true });
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'register') {
        if (!firstName.trim() || !lastName.trim()) throw new Error('Enter your first and last name.');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), account_channel: 'public_cbt' } },
        });
        if (signUpError) throw signUpError;
        if (!data.session || !data.user) {
          setMessage('Account created. Confirm your email, then sign in to activate your candidate profile.');
          setMode('login');
          return;
        }
        await continueAfterAuth(data.user);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        if (!data.user) throw new Error('Authentication returned no user.');
        await continueAfterAuth(data.user);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Candidate authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5">
        <button onClick={() => navigate('/cbt/public')} className="text-xs text-slate-500 flex items-center gap-2"><ArrowLeft size={14} /> Marketplace</button>
        <div>
          <div className="inline-flex rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold items-center gap-2"><UserRound size={14} /> Public candidate account</div>
          <h1 className="text-2xl font-extrabold mt-3">{mode === 'register' ? 'Create your candidate account' : 'Candidate sign in'}</h1>
          <p className="text-sm text-slate-500 mt-1">Your candidate identity and exam access are verified by the Gradifi backend.</p>
        </div>
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-sm font-semibold">
          <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); }} className={'rounded-lg py-2 ' + (mode === 'register' ? 'bg-white shadow-sm' : 'text-slate-500')}>Register</button>
          <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={'rounded-lg py-2 ' + (mode === 'login' ? 'bg-white shadow-sm' : 'text-slate-500')}>Sign in</button>
        </div>
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold">First name<input required value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>
            <label className="text-xs font-semibold">Last name<input required value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>
          </div>}
          <label className="block text-xs font-semibold">Email address<div className="relative mt-1"><Mail size={15} className="absolute left-3 top-3.5 text-slate-400" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 py-3 pl-9 pr-3 text-sm" /></div></label>
          <label className="block text-xs font-semibold">Password<div className="relative mt-1"><Lock size={15} className="absolute left-3 top-3.5 text-slate-400" /><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 py-3 pl-9 pr-3 text-sm" /></div></label>
          <button disabled={busy} className="w-full rounded-xl bg-indigo-600 text-white py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'register' ? 'Create account' : 'Sign in and continue'}
          </button>
        </form>
      </section>
    </main>
  );
};
