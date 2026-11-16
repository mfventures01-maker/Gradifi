import React from 'react';
import { BookOpen, Building2, GraduationCap, LogOut, ShieldCheck, Users } from 'lucide-react';
import type { AuthSessionState } from '../../services/authService';

interface RectorDeanDashboardProps {
  identity: AuthSessionState;
  onLogout: () => void;
}

/**
 * Higher-institution landing dashboard.
 * Deliberately does not display fabricated KPIs or call school-campus APIs.
 * Higher-ed operational modules are added only when their backend contracts exist.
 */
export const RectorDeanDashboard: React.FC<RectorDeanDashboardProps> = ({ identity, onLogout }) => {
  const actorLabel = identity.actorType === 'rector' ? 'Rector' : 'Dean';
  const fullName = identity.profile?.full_name || 'Authenticated institutional leader';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap className="h-6 w-6" /></div>
            <div><p className="text-lg font-black tracking-tight">GRADIFI</p><p className="text-xs text-slate-500">Higher Institution Administration</p></div>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-white sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">{actorLabel} workspace</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome, {fullName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Your session is authenticated and your higher-institution actor identity has been resolved. This workspace is scoped to the institution recorded against that identity.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">Actor: {identity.actorType || 'unresolved'}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">Institution: {identity.institutionId || 'not assigned'}</span>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></div>
            <h2 className="mt-5 font-bold">Institution profile</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Institution context is taken from the authenticated identity record, not a URL parameter or demo institution ID.</p>
            <p className="mt-4 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{identity.institutionId || 'No institution linked'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
            <h2 className="mt-5 font-bold">Verified access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This page is rendered only after Supabase authentication and active identity-actor resolution.</p>
            <p className="mt-4 text-xs font-semibold text-emerald-700">Authenticated session</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Users className="h-5 w-5" /></div>
            <h2 className="mt-5 font-bold">Academic leadership</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">The higher-ed actor model is separate from the school Principal, teacher and student dashboard.</p>
            <p className="mt-4 text-xs text-slate-500">Dean / Rector access boundary</p>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <div className="flex items-start gap-4">
            <BookOpen className="mt-1 h-6 w-6 shrink-0 text-blue-600" />
            <div>
              <h2 className="font-bold">Higher-institution modules</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Faculty, department, programme, lecturer and student management are not represented as live here yet. The deployed onboarding contract confirms the Dean bootstrap path, while operational module RPCs and permissions still require verification. No sample counts or placeholder records are shown as institutional data.</p>
              <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Operational data integration pending verification</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RectorDeanDashboard;
