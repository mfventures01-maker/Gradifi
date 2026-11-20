import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Building2, CheckCircle2, Clock3, LogOut,
  RefreshCw, ShieldCheck, XCircle,
} from "lucide-react";
import {
  InstitutionDecision,
  PendingHigherEdInstitution,
  superAdminInstitutionApprovalService,
} from "../../services/superAdminInstitutionApprovalService";

const titleForType = (value: string) => ({
  university: "University",
  polytechnic: "Polytechnic",
  college_of_education: "College of Education",
}[value] || value.replaceAll("_", " "));

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium", timeStyle: "short",
}).format(new Date(value));

export const SuperAdminInstitutionApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingHigherEdInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<PendingHigherEdInstitution | null>(null);
  const [decision, setDecision] = useState<InstitutionDecision>("approved");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const rows = await superAdminInstitutionApprovalService.listPending();
      setItems(rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load pending institutions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const beginDecision = (item: PendingHigherEdInstitution, next: InstitutionDecision) => {
    setTarget(item);
    setDecision(next);
    setReason("");
    setNotice("");
    setError("");
  };

  const submitDecision = async () => {
    if (!target) return;
    if (reason.trim().length < 10) {
      setError("Enter a decision reason of at least 10 characters.");
      return;
    }
    if (decision === "approved" && !target.can_approve) {
      setError("This institution has unresolved provisioning checks and cannot be approved yet.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const receipt = await superAdminInstitutionApprovalService.review(
        target.institution_id, decision, reason,
      );
      setNotice(
        receipt.decision === "approved"
          ? `${target.institution_name} is now active. Its Dean can proceed with academic onboarding.`
          : `${target.institution_name} was rejected. The decision and reason were recorded.`,
      );
      setTarget(null);
      setReason("");
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The institution decision failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await (await import("../../lib/supabase")).supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
              <ShieldCheck className="h-4 w-4" /> Gradifi · Platform administration
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Institution approvals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review higher-education registrations, verify the executive and initial Dean setup, then approve or reject with an auditable reason.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>

        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Pending higher-education applications</h2>
            <p className="text-sm text-slate-500">Only university, polytechnic and college of education registrations appear here.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800">{items.length} pending</span>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading institution review queue…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No pending institutions</h3>
            <p className="mt-1 text-sm text-slate-500">New higher-education registrations will appear here after Rector/VC bootstrap.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <article key={item.institution_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Pending review</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{titleForType(item.institution_type)}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-slate-950">{item.institution_name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.institution_address || "Address not supplied"} · {item.country}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Submitted {dateLabel(item.submitted_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => beginDecision(item, "rejected")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button onClick={() => beginDecision(item, "approved")} disabled={!item.can_approve} title={!item.can_approve ? item.readiness_reason : "Approve institution"} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Registration</p>
                    <p className="mt-2 text-sm text-slate-800">Number: {item.registration_number || "Not supplied"}</p>
                    <p className="mt-1 text-sm text-slate-800">Phone: {item.institution_phone || "Not supplied"}</p>
                    <p className="mt-1 break-all text-sm text-slate-800">Website: {item.website_url || "Not supplied"}</p>
                    <p className="mt-1 text-xs text-slate-500">Slug: {item.institution_slug}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">VC / Rector</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.authority_name || "Missing authority profile"}</p>
                    <p className="mt-1 break-all text-sm text-slate-600">{item.authority_email || "No email"}</p>
                    <p className="mt-2 text-xs text-slate-500">Role: {item.authority_role || "Missing"} · Membership: {item.authority_membership_status || "Missing"} · Identity: {item.authority_actor_status || "Missing"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Initial Dean & campus</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.dean_name || "Dean not provisioned"}</p>
                    <p className="mt-1 text-xs text-slate-500">Dean identity: {item.dean_status || "Missing"} · Membership: {item.dean_membership_status || "Missing"} · Provisioning: {item.dean_job_status || "Missing"}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-700"><Building2 className="h-4 w-4" /> {item.campus_name || "Bootstrap campus missing"}</p>
                  </div>
                </div>

                <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${item.can_approve ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  {item.can_approve ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.can_approve ? "Provisioning checks passed" : "Approval is blocked"}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.readiness_reason}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {target && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <h2 id="decision-title" className="text-xl font-bold text-slate-950">{decision === "approved" ? "Approve institution" : "Reject institution"}</h2>
              <p className="mt-2 text-sm text-slate-600">{target.institution_name}. {decision === "approved" ? "Approval activates the institution and unlocks Dean campus access." : "Rejection closes this pending application and is recorded in the audit trail."}</p>
              {decision === "approved" && !target.can_approve && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{target.readiness_reason}</p>}
              <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="decision-reason">Decision reason</label>
              <textarea id="decision-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} maxLength={2000} placeholder="Record the basis for this decision (minimum 10 characters)." className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              <p className="mt-1 text-xs text-slate-500">{reason.trim().length}/10 minimum characters</p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={() => setTarget(null)} disabled={submitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                <button onClick={() => void submitDecision()} disabled={submitting || reason.trim().length < 10 || (decision === "approved" && !target.can_approve)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${decision === "approved" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                  {submitting ? "Recording decision…" : decision === "approved" ? "Confirm approval" : "Confirm rejection"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};
