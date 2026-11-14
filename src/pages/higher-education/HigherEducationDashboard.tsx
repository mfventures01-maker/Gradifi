import React, { useEffect, useState } from "react";
import { authService, AuthSessionState } from "../../services/authService";

export const HigherEducationDashboard: React.FC = () => {
  const [identity, setIdentity] = useState<AuthSessionState | null>(null);
  useEffect(() => { authService.resolveCurrentIdentity().then(setIdentity).catch(() => setIdentity(null)); }, []);
  return <main className="min-h-screen bg-slate-50 p-6">
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">SEFAES • Higher Education</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{identity?.profile?.full_name || "Academic Staff Portal"}</h1>
      <p className="mt-2 text-sm text-slate-600">Authenticated role: <strong>{identity?.role || "Resolving identity..."}</strong></p>
      <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Your generated account is authenticated. Academic permissions and role-specific workflows remain governed by institution, faculty and department assignments.</p>
    </section>
  </main>;
};
