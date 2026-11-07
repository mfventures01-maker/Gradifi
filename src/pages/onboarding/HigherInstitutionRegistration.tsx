import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onboardingService } from "../../services/onboardingService";

export const HigherInstitutionRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    institution_name: "",
    institution_type: "university" as "university" | "polytechnic" | "college_of_education",
    registration_number: "",
    country: "Nigeria",
    address: "",
    phone: "",
    website: "",
    dean_name: "",
    dean_email: "",
    dean_phone: "",
    dean_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const pending = localStorage.getItem("sefaes.pending-root-onboarding");
    if (pending) {
      onboardingService.completePendingRootRegistration()
        .then(() => navigate("/portal/higher-education", { replace: true }))
        .catch((err) => {
          if (err instanceof Error && err.message !== "VERIFIED_ROOT_SESSION_REQUIRED") {
            setError(err.message);
          }
        });
    }
  }, [navigate]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await onboardingService.createHigherInstitutionAccount(form);
      if (result.requires_email_confirmation) {
        setMessage("Verify the Dean email address using the confirmation link. Return to this page after verification to complete institution creation.");
      } else {
        navigate("/portal/higher-education");
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
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Create your institution account</h1>
          <p className="mt-2 text-sm text-slate-600">The Dean creates the institution and becomes its root authority. HOD, Adviser, Lecturer and Student accounts are provisioned from the Dean's authenticated institution workspace.</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800">Institution details</h2>
          <input required value={form.institution_name} onChange={e => set("institution_name", e.target.value)} placeholder="Institution name" className="w-full rounded-lg border p-3" />
          <select value={form.institution_type} onChange={e => set("institution_type", e.target.value)} className="w-full rounded-lg border p-3">
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
          <h2 className="font-semibold text-slate-800">Dean account</h2>
          <input required value={form.dean_name} onChange={e => set("dean_name", e.target.value)} placeholder="Dean full name" className="w-full rounded-lg border p-3" />
          <input required type="email" value={form.dean_email} onChange={e => set("dean_email", e.target.value)} placeholder="Dean email" className="w-full rounded-lg border p-3" />
          <input value={form.dean_phone} onChange={e => set("dean_phone", e.target.value)} placeholder="Dean phone" className="w-full rounded-lg border p-3" />
          <input required type="password" minLength={10} value={form.dean_password} onChange={e => set("dean_password", e.target.value)} placeholder="Create password (10+ characters)" className="w-full rounded-lg border p-3" />
        </section>

        {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
          {loading ? "Creating account…" : "Create Higher-Institution Account"}
        </button>
      </form>
    </main>
  );
};
