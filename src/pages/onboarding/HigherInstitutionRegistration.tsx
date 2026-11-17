import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  onboardingService,
  CreateInstitutionAccountResponse,
  HigherInstitutionFormInput,
} from "../../services/onboardingService";
import { authService } from "../../services/authService";

type InstitutionType = HigherInstitutionFormInput["institution_type"];
type Step = 1 | 2 | 3;
type Draft = Omit<HigherInstitutionFormInput, "authority_password">;

const DRAFT_KEY = "sefaes.higher-institution-draft.v1";

const emptyDraft: Draft = {
  institution_name: "",
  institution_type: "university",
  registration_number: "",
  country: "Nigeria",
  address: "",
  phone: "",
  website: "",
  authority_name: "",
  authority_email: "",
  authority_phone: "",
  dean_name: "",
  dean_phone: "",
};

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export const HigherInstitutionRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [hasPendingRoot, setHasPendingRoot] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreateInstitutionAccountResponse | null>(null);

  const authorityTitle = draft.institution_type === "university" ? "Vice-Chancellor" : "Rector";
  const progress = useMemo(() => [
    { id: 1, title: "Institution" },
    { id: 2, title: "Authority & Dean" },
    { id: 3, title: "Review" },
  ], []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft({ ...emptyDraft, ...parsed });
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      // Only non-secret form data is retained. The authority password is never
      // written to browser storage; the server derives retry identity from the
      // verified authority and canonical request fingerprint.
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage can be unavailable in private browsing; the live form remains usable.
    }
  }, [draft]);

  useEffect(() => {
    let active = true;
    const resume = async () => {
      try {
        let action: string | null = null;
        const pendingRaw = localStorage.getItem("sefaes.pending-root-onboarding");
        if (pendingRaw) {
          try { action = JSON.parse(pendingRaw).action || null; }
          catch { localStorage.removeItem("sefaes.pending-root-onboarding"); }
        }
        if (!action) {
          const user = await authService.getCurrentUser();
          action = user?.user_metadata?.requested_root_action || null;
        }
        if (action === "bootstrap_school_institution") {
          navigate("/onboarding", { replace: true });
          return;
        }
        if (action !== "bootstrap_higher_institution") return;
        if (active) setHasPendingRoot(true);

        const result = await onboardingService.completePendingRootRegistration();
        if (!active) return;
        setCreated(result);
        setMessage(result.pin_not_reissued
          ? "Recovery complete. The original Dean identity was verified and reused. No duplicate account was created and the existing PIN was not changed."
          : "Institution and initial Dean provisioning completed successfully.");
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        if (!active) return;
        if (err instanceof Error && err.message === "VERIFIED_ROOT_SESSION_REQUIRED") return;
        setError(err instanceof Error ? err.message : "Could not resume institution provisioning.");
        setHasPendingRoot(true);
      } finally {
        if (active) setResuming(false);
      }
    };
    void resume();
    return () => { active = false; };
  }, [navigate]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setError("");
  };

  const validateStep = (target: Step): string | null => {
    if (target === 1) {
      if (!draft.institution_name.trim() || !draft.address.trim() || !draft.country.trim()) {
        return "Enter the institution name, address and country before continuing.";
      }
    }
    if (target === 2) {
      if (!draft.authority_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.authority_email.trim())) {
        return "Enter the institutional authority's full name and a valid official email.";
      }
      if (password.length < 10) return "The authority password must contain at least 10 characters.";
      if (!draft.dean_name.trim()) return "Enter the appointed Dean's full name.";
    }
    return null;
  };

  const next = () => {
    const validation = validateStep(step);
    if (validation) { setError(validation); return; }
    setError("");
    setStep(current => Math.min(3, current + 1) as Step);
  };

  const submit = async () => {
    const validation = validateStep(1) || validateStep(2);
    if (validation) { setError(validation); setStep(validation.includes("institution") ? 1 : 2); return; }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await onboardingService.createHigherInstitutionAccount({
        ...draft,
        authority_password: password,
      });
      setHasPendingRoot(true);
      if (result.requires_email_confirmation) {
        setMessage(`A verification link has been sent to the ${authorityTitle}'s official email. Verify that email, then return to this page and choose “Resume provisioning”.`);
        setPassword("");
      } else {
        setCreated(result);
        setHasPendingRoot(false);
        setMessage(result.pin_not_reissued
          ? "Recovery complete. The original Dean identity was reused; no duplicate was created and the PIN was not changed."
          : "Institution and initial Dean provisioning completed successfully.");
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch (err) {
      setHasPendingRoot(true);
      setError(err instanceof Error ? err.message : "Higher-institution registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const resumeProvisioning = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await onboardingService.completePendingRootRegistration();
      setCreated(result);
      setHasPendingRoot(false);
      setMessage(result.pin_not_reissued
        ? "Recovery complete. The original Dean identity was verified and reused. No duplicate account was created and the existing PIN was not changed."
        : "Institution and initial Dean provisioning completed successfully.");
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning could not be resumed.");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">{label && <span className={labelClass}>{label}</span>}{children}</label>
  );

  if (resuming) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p className="text-sm text-slate-600">Checking for a pending institutional setup…</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Gradifi · Higher Education</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Institution onboarding</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A guided, resumable setup for universities, polytechnics and colleges of education. The verified VC/Rector is the root authority; the first Dean is provisioned beneath that authority.</p>
        </header>

        <nav aria-label="Onboarding progress" className="mb-6 grid grid-cols-3 gap-2">
          {progress.map(item => (
            <div key={item.id} className={`rounded-xl border px-3 py-3 text-center text-sm ${step === item.id ? "border-indigo-600 bg-indigo-50 text-indigo-800" : step > item.id ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold">{step > item.id ? "✓" : item.id}</span>
              <span className="font-semibold">{item.title}</span>
            </div>
          ))}
        </nav>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div><h2 className="text-xl font-semibold text-slate-900">Institution details</h2><p className="mt-1 text-sm text-slate-500">These details identify the institution and its first campus.</p></div>
              <Field label="Institution name"><input required className={inputClass} value={draft.institution_name} onChange={e => update("institution_name", e.target.value)} autoComplete="organization" placeholder="e.g. Example University" /></Field>
              <Field label="Institution type"><select className={inputClass} value={draft.institution_type} onChange={e => update("institution_type", e.target.value as InstitutionType)}><option value="university">University</option><option value="polytechnic">Polytechnic</option><option value="college_of_education">College of Education</option></select></Field>
              <Field label="Registration / accreditation number (optional)"><input className={inputClass} value={draft.registration_number} onChange={e => update("registration_number", e.target.value)} placeholder="Official registration number" /></Field>
              <Field label="Institution address"><input required className={inputClass} value={draft.address} onChange={e => update("address", e.target.value)} placeholder="Street, city, state" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country"><input required className={inputClass} value={draft.country || ""} onChange={e => update("country", e.target.value)} /></Field>
                <Field label="Institution phone (optional)"><input className={inputClass} value={draft.phone} onChange={e => update("phone", e.target.value)} placeholder="+234…" /></Field>
              </div>
              <Field label="Website (optional)"><input type="url" className={inputClass} value={draft.website || ""} onChange={e => update("website", e.target.value)} placeholder="https://" /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div><h2 className="text-xl font-semibold text-slate-900">{authorityTitle} and initial Dean</h2><p className="mt-1 text-sm text-slate-500">The authority email must be verified before provisioning can finish.</p></div>
              <Field label={`${authorityTitle} full name`}><input required className={inputClass} value={draft.authority_name} onChange={e => update("authority_name", e.target.value)} autoComplete="name" /></Field>
              <Field label="Official authority email"><input required type="email" className={inputClass} value={draft.authority_email} onChange={e => update("authority_email", e.target.value)} autoComplete="email" /></Field>
              <Field label="Authority phone (optional)"><input className={inputClass} value={draft.authority_phone} onChange={e => update("authority_phone", e.target.value)} /></Field>
              <Field label="Create authority password"><input required type="password" minLength={10} className={inputClass} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /><span className="mt-1 block text-xs text-slate-500">Minimum 10 characters. Never saved in browser storage.</span></Field>
              <div className="border-t border-slate-100 pt-5"><Field label="Appointed Dean full name"><input required className={inputClass} value={draft.dean_name} onChange={e => update("dean_name", e.target.value)} /></Field><div className="mt-4"><Field label="Dean phone (optional)"><input className={inputClass} value={draft.dean_phone} onChange={e => update("dean_phone", e.target.value)} /></Field></div><p className="mt-3 text-xs leading-5 text-slate-500">The Dean does not need a separate email/password signup. Gradifi provisions a login ID and temporary six-digit PIN. A retry reuses the same provisioning job and does not rotate or re-display an existing PIN.</p></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div><h2 className="text-xl font-semibold text-slate-900">Review before submission</h2><p className="mt-1 text-sm text-slate-500">Check the canonical request values. Re-submitting an unchanged request resumes the same deterministic provisioning operation.</p></div>
              <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                {[
                  ["Institution", draft.institution_name],
                  ["Type", draft.institution_type.replace(/_/g, " ")],
                  ["Registration number", draft.registration_number || "Not supplied"],
                  ["Address", draft.address],
                  ["Country", draft.country || "Nigeria"],
                  ["Institution phone", draft.phone || "Not supplied"],
                  ["Website", draft.website || "Not supplied"],
                  [authorityTitle, draft.authority_name],
                  ["Verified email to create", draft.authority_email.toLowerCase()],
                  ["Initial Dean", draft.dean_name],
                  ["Dean phone", draft.dean_phone || "Not supplied"],
                ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value}</dd></div>)}
              </dl>
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">The request fingerprint is generated by the server from the normalized institution, authority and Dean details. Keep these details unchanged when resuming a failed operation. The Dean PIN is never stored in the recovery ledger.</p>
            </div>
          )}

          {message && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
          {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

          {created?.initial_admin && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-semibold text-emerald-950">Dean provisioning receipt</h3>
              <p className="mt-1 text-sm text-emerald-800">{created.initial_admin.pin ? "Share this temporary credential securely with the appointed Dean." : "This is a recovered receipt. The existing Dean identity and PIN were preserved; the PIN is intentionally not re-displayed."}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="inline font-semibold">Name: </dt><dd className="inline">{created.initial_admin.full_name}</dd></div>
                <div><dt className="inline font-semibold">Login ID: </dt><dd className="inline font-mono">{created.initial_admin.login_id}</dd></div>
                {created.initial_admin.pin && <div><dt className="inline font-semibold">Temporary PIN: </dt><dd className="inline font-mono">{created.initial_admin.pin}</dd></div>}
                <div><dt className="inline font-semibold">Authority: </dt><dd className="inline">{created.authority_title || authorityTitle}</dd></div>
                <div><dt className="inline font-semibold">Recovery job: </dt><dd className="inline font-mono">{created.provisioning?.job_id || "Completed"}</dd></div>
              </dl>
              <button type="button" onClick={() => navigate("/portal/higher-education")} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700">Continue to institutional overview</button>
            </div>
          )}

          {!created?.initial_admin && (
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setStep(current => Math.max(1, current - 1) as Step)} disabled={step === 1 || loading} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40">Back</button>
              {hasPendingRoot ? (
                <button type="button" onClick={resumeProvisioning} disabled={loading} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Resuming…" : "Resume provisioning"}</button>
              ) : step < 3 ? (
                <button type="button" onClick={next} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Continue</button>
              ) : (
                <button type="button" onClick={submit} disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Submitting…" : "Create institution and provision Dean"}</button>
              )}
            </div>
          )}
        </section>
        <p className="mt-4 text-center text-xs text-slate-500">Repeat-safe onboarding · verified authority · one initial Dean · resumable recovery</p>
      </div>
    </main>
  );
};
