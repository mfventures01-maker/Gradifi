import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onboardingService, CreateInstitutionAccountResponse } from "../../services/onboardingService";
import { authService } from "../../services/authService";

type HigherInstitutionType = "university" | "polytechnic" | "college_of_education";

export const HigherInstitutionRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    institution_name: "",
    institution_type: "university" as HigherInstitutionType,
    registration_number: "",
    country: "Nigeria",
    address: "",
    phone: "",
    website: "",
    authority_name: "",
    authority_email: "",
    authority_phone: "",
    authority_password: "",
    dean_name: "",
    dean_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreateInstitutionAccountResponse | null>(null);

  const authorityTitle = form.institution_type === "university" ? "Vice-Chancellor" : "Rector";

  useEffect(() => {
    let active = true;
    const resumePendingRegistration = async () => {
      let pendingAction: string | null = null;
      const raw = localStorage.getItem("sefaes.pending-root-onboarding");
      if (raw) {
        try {
          pendingAction = JSON.parse(raw).action || null;
        } catch {
          localStorage.removeItem("sefaes.pending-root-onboarding");
        }
      }
      if (!pendingAction) {
        try {
          const user = await authService.getCurrentUser();
          pendingAction = user?.user_metadata?.requested_root_action || null;
        } catch {
          // No active session yet. The user can return after confirming email.
        }
      }
      if (pendingAction === "bootstrap_school_institution") {
        navigate("/onboarding", { replace: true });
        return;
      }
      if (pendingAction !== "bootstrap_higher_institution") return;

      try {
        const result = await onboardingService.completePendingRootRegistration();
        if (!active) return;
        setCreated(result);
        setMessage("Institution authority verified and institution created. The initial Dean account has been provisioned.");
      } catch (err) {
        if (active && err instanceof Error && err.message !== "VERIFIED_ROOT_SESSION_REQUIRED") {
          setError(err.message);
        }
      }
    };
    void resumePendingRegistration();
    return () => { active = false; };
  }, [navigate]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setCreated(null);
    try {
      const result = await onboardingService.createHigherInstitutionAccount(form);
      if (result.requires_email_confirmation) {
        setMessage(`A verification link has been sent to the ${authorityTitle}'s email address. Only this institutional authority email requires verification. Return here after verifying it to finish institution setup.`);
      } else {
        setCreated(result);
        setMessage("Institution created. The initial Dean account has been provisioned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Higher-institution registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 rounded-2xl bg-white p-7 shadow-xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">SEFAES Higher Education</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Register your institution</h1>
          <p className="mt-2 text-sm text-slate-600">The {authorityTitle} is the institution's highest authority and signs in with a verified email and password. The Dean is provisioned as the operational administrator with a generated login ID and PIN.</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800">Institution details</h2>
          <input required value={form.institution_name} onChange={e => set("institution_name", e.target.value)} placeholder="Institution name" className="w-full rounded-lg border p-3" />
          <select value={form.institution_type} onChange={e => set("institution_type", e.target.value as HigherInstitutionType)} className="w-full rounded-lg border p-3">
            <option value="university">University</option>
            <option value="polytechnic">Polytechnic</option>
            <option value="college_of_education">College of Education</option>
          </select>
          <input value={form.registration_number} onChange={e => set("registration_number", e.target.value)} placeholder="Registration / accreditation number" className="w-full rounded-lg border p-3" />
          <input required value={form.address} onChange={e => set("address", e.target.value)} placeholder="Institution address" className="w-full rounded-lg border p-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={form.country} onChange={e => set("country", e.target.value)} placeholder="Country" className="w-full rounded-lg border p-3" />
            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Institution phone" className="w-full rounded-lg border p-3" />
          </div>
          <input type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="Website (optional)" className="w-full rounded-lg border p-3" />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800">{authorityTitle} account · Email verification</h2>
          <input required value={form.authority_name} onChange={e => set("authority_name", e.target.value)} placeholder={`${authorityTitle} full name`} className="w-full rounded-lg border p-3" />
          <input required type="email" value={form.authority_email} onChange={e => set("authority_email", e.target.value)} placeholder={`${authorityTitle} official email`} className="w-full rounded-lg border p-3" />
          <input value={form.authority_phone} onChange={e => set("authority_phone", e.target.value)} placeholder="Phone (optional)" className="w-full rounded-lg border p-3" />
          <input required type="password" minLength={10} value={form.authority_password} onChange={e => set("authority_password", e.target.value)} placeholder="Create password (10+ characters)" className="w-full rounded-lg border p-3" />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800">Initial Dean appointment · PIN access</h2>
          <input required value={form.dean_name} onChange={e => set("dean_name", e.target.value)} placeholder="Dean full name" className="w-full rounded-lg border p-3" />
          <input value={form.dean_phone} onChange={e => set("dean_phone", e.target.value)} placeholder="Dean phone (optional)" className="w-full rounded-lg border p-3" />
          <p className="text-xs text-slate-500">No Dean email verification or password is required. Gradifi generates the Dean's login ID and temporary six-digit PIN.</p>
        </section>

        {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {created?.initial_admin && (
          <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-semibold text-emerald-900">Initial Dean credentials</h2>
            <p className="text-sm text-emerald-800">Share these credentials securely with the appointed Dean. The temporary PIN should be changed at first sign-in.</p>
            <div className="rounded-lg bg-white p-3 text-sm">
              <p><strong>Name:</strong> {created.initial_admin.full_name}</p>
              <p><strong>Login ID:</strong> <code>{created.initial_admin.login_id}</code></p>
              <p><strong>Temporary PIN:</strong> <code>{created.initial_admin.pin}</code></p>
              <p><strong>Institutional authority:</strong> {created.authority_title || authorityTitle}</p>
            </div>
            <button type="button" onClick={() => navigate("/portal/higher-education")} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white">Continue to institutional overview</button>
          </section>
        )}

        {!created?.initial_admin && (
          <button disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? "Creating institution…" : "Create Higher-Institution Account"}
          </button>
        )}
      </form>
    </main>
  );
};
