import React from 'react';
import { ArrowRight, BookOpen, Cpu, GraduationCap, School, ShieldCheck, Users } from 'lucide-react';

interface HomePageProps {
  onStartOnboarding: () => void;
  onGoToDashboard: (institutionId?: string, role?: string) => void;
}

const features = [
  { icon: Cpu, title: 'AI-assisted grading', description: 'Support consistent assessment with teacher-defined rubrics and reviewable grading workflows.' },
  { icon: BookOpen, title: 'Assessment management', description: 'Bring academic assessments and examination workflows into one institutional platform.' },
  { icon: Users, title: 'People and roles', description: 'Organise staff, learners and institutional actors around their authorised responsibilities.' },
  { icon: ShieldCheck, title: 'Institutional control', description: 'Keep institutional access behind verified authentication and role-aware application routes.' },
];

export const HomePage: React.FC<HomePageProps> = ({ onStartOnboarding, onGoToDashboard }) => (
  <div className="min-h-screen bg-white text-slate-900 antialiased">
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="text-2xl font-black tracking-tight text-blue-600">GRADIFI</a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-blue-600">Platform</a>
          <a href="#institutions" className="hover:text-blue-600">Institutions</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => onGoToDashboard()} className="rounded-full border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Secure login</button>
          <button onClick={onStartOnboarding} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Register institution</button>
        </div>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <GraduationCap className="h-4 w-4" /> Institutional assessment platform
            </div>
            <h1 className="max-w-2xl text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">Better assessment. Clearer academic oversight.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Gradifi brings assessment, academic operations and institutional workflows into a connected platform for schools and higher institutions.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={onStartOnboarding} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Get started <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => onGoToDashboard()} className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Institution sign in</button>
            </div>
            <p className="mt-4 text-xs text-slate-500">Sign-in is verified through the institution's configured authentication flow. No demo credentials are accepted here.</p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-2xl shadow-blue-900/10">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><School className="h-6 w-6" /></div>
              <div><p className="font-bold">One platform, distinct institutions</p><p className="text-sm text-slate-500">School and higher-ed workflows</p></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-500">Schools</p><p className="mt-2 text-xl font-black">Campus</p><p className="mt-1 text-xs text-slate-500">Principal-led administration</p></div>
              <div className="rounded-2xl bg-blue-50 p-5"><p className="text-sm font-semibold text-blue-700">Higher education</p><p className="mt-2 text-xl font-black text-slate-900">Institution</p><p className="mt-1 text-xs text-slate-500">Rector / Dean oversight</p></div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" /> Dashboard access requires a verified session and resolved institutional identity.</div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-blue-600">The platform</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tools for the work institutions do every day.</h2><p className="mt-4 text-slate-600">A connected foundation for assessment and academic administration, with access shaped by each user's institutional role.</p></div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-slate-200 p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}
        </div>
      </section>

      <section id="institutions" className="bg-slate-950 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div><h2 className="text-3xl font-black">Built around your institution.</h2><p className="mt-3 max-w-2xl text-slate-300">School administration remains distinct from higher-institution leadership workflows. Each dashboard follows the authenticated actor and institution context.</p></div>
          <button onClick={onStartOnboarding} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 hover:bg-blue-50">Start institution setup <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>
    </main>
    <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500">© 2026 Gradifi. Institutional assessment and academic operations.</footer>
  </div>
);

export default HomePage;
