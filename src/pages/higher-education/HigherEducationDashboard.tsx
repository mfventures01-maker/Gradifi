import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authService, AuthSessionState } from "../../services/authService";
import { supabase } from "../../lib/supabase";

export const HigherEducationDashboard: React.FC = () => {
  const [identity, setIdentity] = useState<AuthSessionState | null>(null);
  const [institutionStatus, setInstitutionStatus] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    authService.resolveCurrentIdentity()
      .then(async value => {
        if (!active) return;
        setIdentity(value);
        if (value.institutionId) {
          const { data, error } = await supabase.from("institutions")
            .select("status")
            .eq("id", value.institutionId)
            .maybeSingle();
          if (active && !error) setInstitutionStatus(data?.status || null);
        }
      })
      .catch(() => { if (active) setIdentity(null); });
    return () => { active = false; };
  }, []);

  const isExecutive = identity?.role === "vice_chancellor" || identity?.role === "rector";
  const isDean = identity?.role === "dean";
  const roleTitle = identity?.role === "vice_chancellor"
    ? "Vice-Chancellor"
    : identity?.role === "rector"
      ? "Rector"
      : identity?.role === "dean"
        ? "Dean"
        : identity?.role || "Higher Education";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Gradifi · Higher Education</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {identity?.profile?.full_name || "Institution workspace"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{roleTitle}</span>
            <span className="text-xs text-slate-500">{identity?.isAuthenticated ? "Authenticated account" : "Resolving identity…"}</span>
            {institutionStatus && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${institutionStatus === "active" ? "bg-emerald-50 text-emerald-800" : institutionStatus === "pending" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>Institution: {institutionStatus}</span>}
          </div>

          {isExecutive ? (
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
              <h2 className="font-semibold text-indigo-950">Executive institutional authority</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-indigo-900">
                Your VC/Rector account is the institution's root authority. You appoint the Dean, retain institutional oversight and accountability, while routine academic account provisioning is delegated to the Dean.
              </p>
            </div>
          ) : isDean ? (
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
              <h2 className="font-semibold text-indigo-950">Dean administration workspace</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-indigo-900">
                Your independent Login ID and PIN identity is linked to the institution's VC/Rector. You can provision HOD, Course Adviser, Lecturer and Student accounts. Each account receives its own generated Login ID and temporary PIN.
              </p>
              <Link to="/onboarding/higher-education" className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Manage academic accounts <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-900">Academic access</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your access is governed by your institutional authority, faculty and department assignments. Account provisioning is managed by the institution's Dean.
              </p>
            </div>
          )}
        </header>

        {isDean && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["HOD", "Department leadership"],
              ["Adviser", "Course and student guidance"],
              ["Lecturer", "Academic teaching staff"],
              ["Student", "Independent student identity"],
            ].map(([label, description]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};
