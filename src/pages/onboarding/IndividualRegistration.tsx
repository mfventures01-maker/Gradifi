import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type PublicAccountType = "freelancer" | "independent_student" | "independent_professional" | "other_individual";
const PENDING_KEY = "gradifi.pending-public-individual";

export const IndividualRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<PublicAccountType>("independent_student");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const completeRegistration = async (sessionUser?: { email?: string | null; user_metadata?: Record<string, any> }) => {
    const { data: sessionData } = sessionUser ? { data: { session: null } } : await supabase.auth.getSession();
    const user = sessionUser || sessionData.session?.user;
    if (!user) return;

    let pending: any = null;
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      pending = raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }

    const metadata = user.user_metadata || {};
    const name = String(pending?.full_name || metadata.full_name || "").trim();
    const kind = String(pending?.account_type || metadata.requested_account_type || "");
    const expectedEmail = String(pending?.email || user.email || "").toLowerCase();
    if (!name || !kind || !expectedEmail || user.email?.toLowerCase() !== expectedEmail) return;

    if (!["freelancer", "independent_student", "independent_professional", "other_individual"].includes(kind)) {
      setError("The requested public account category is not supported.");
      return;
    }

    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("bootstrap_public_individual", {
      p_full_name: name,
      p_account_type: kind,
    } as any);
    setLoading(false);

    if (rpcError || !data?.success || data.role !== "individual" || data.institution_id !== null) {
      setError(rpcError?.message || data?.error || "Public account setup could not be verified.");
      return;
    }

    localStorage.removeItem(PENDING_KEY);
    navigate("/portal/individual", { replace: true });
  };

  useEffect(() => {
    let active = true;
    const finish = async () => {
      if (!active) return;
      try {
        await completeRegistration();
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Account setup failed.");
      }
    };
    void finish();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) queueMicrotask(() => {
        if (active) void completeRegistration(session.user);
      });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) return setError("Enter your full name.");
    if (password.length < 10) return setError("Use a password with at least 10 characters.");
    setLoading(true);

    const pending = {
      full_name: fullName.trim().replace(/\s+/g, " "),
      email: normalizedEmail,
      account_type: accountType,
    };
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding/individual/register`,
        data: {
          full_name: pending.full_name,
          requested_account_type: accountType,
          account_path: "public_individual",
        },
      },
    });

    setLoading(false);
    if (signupError) {
      localStorage.removeItem(PENDING_KEY);
      setError(signupError.message);
      return;
    }
    if (data.session) {
      await completeRegistration();
    } else {
      setNotice("Check your email and confirm your address. Gradifi will finish creating your independent account when you return through the confirmation link.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link to="/onboarding/start" className="text-sm font-semibold text-indigo-700">← All registration paths</Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Public registration</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create your individual account</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">For freelancers, independent students and professionals using Gradifi outside an institution. This account is not enrolled in a school or university.</p>

        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">I am joining as
            <select value={accountType} onChange={e => setAccountType(e.target.value as PublicAccountType)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3">
              <option value="independent_student">Independent student / learner</option>
              <option value="freelancer">Freelancer</option>
              <option value="independent_professional">Independent professional</option>
              <option value="other_individual">Other individual user</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Full name
            <input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Email address
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={10} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3" />
            <span className="mt-1 block text-xs text-slate-500">At least 10 characters. Email confirmation is required.</span>
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Creating your account…" : "Create individual account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">Joining through a school or university instead? <Link to="/onboarding/start" className="font-semibold text-indigo-700">Choose institution registration</Link>.</p>
        <p className="mt-3 text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-indigo-700">Sign in</Link>.</p>
      </div>
    </main>
  );
};

export default IndividualRegistration;
