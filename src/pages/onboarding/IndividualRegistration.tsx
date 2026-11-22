import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  individualOnboardingService,
  type PublicIndividualAccountType,
} from "../../services/individualOnboardingService";

const PENDING_KEY = "gradifi.pending-public-individual";

type PendingRegistration = {
  full_name: string;
  email: string;
  account_type: PublicIndividualAccountType;
};

type AuthUserForOnboarding = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

const accountOptions: Array<{
  value: PublicIndividualAccountType;
  label: string;
  description: string;
}> = [
  {
    value: "freelancer",
    label: "Freelancer",
    description: "Independent writers, researchers, consultants and other professionals.",
  },
  {
    value: "independent_student",
    label: "Independent student / learner",
    description: "A learner using Gradifi without a school or university account.",
  },
  {
    value: "independent_professional",
    label: "Independent professional",
    description: "A professional using Gradifi outside an institution.",
  },
  {
    value: "other_individual",
    label: "Other individual",
    description: "An individual who does not fit the other categories.",
  },
];

const isPublicAccountType = (value: unknown): value is PublicIndividualAccountType =>
  value === "freelancer" ||
  value === "independent_student" ||
  value === "independent_professional" ||
  value === "other_individual";

const readPendingRegistration = (): PendingRegistration | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingRegistration>;
    if (
      typeof value.full_name !== "string" ||
      typeof value.email !== "string" ||
      !isPublicAccountType(value.account_type)
    ) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return {
      full_name: value.full_name,
      email: value.email.toLowerCase(),
      account_type: value.account_type,
    };
  } catch {
    localStorage.removeItem(PENDING_KEY);
    return null;
  }
};

const getProvisioningDetails = (user: AuthUserForOnboarding) => {
  const pending = readPendingRegistration();
  const metadata = user.user_metadata || {};
  const fullName = String(pending?.full_name || metadata.full_name || "").trim();
  const accountType = pending?.account_type || metadata.requested_account_type;
  const expectedEmail = String(pending?.email || user.email || "").trim().toLowerCase();
  const actualEmail = String(user.email || "").trim().toLowerCase();

  if (!fullName || !isPublicAccountType(accountType) || !expectedEmail || !actualEmail) {
    return { error: "PENDING_INDIVIDUAL_REGISTRATION_NOT_FOUND" as const };
  }
  if (expectedEmail !== actualEmail) {
    return { error: "REGISTRATION_EMAIL_SESSION_MISMATCH" as const };
  }

  return {
    fullName,
    accountType,
    email: actualEmail,
  };
};

const getFriendlyError = (message: string) => {
  if (message.includes("VERIFIED_EMAIL_REQUIRED")) {
    return "Confirm your email address before completing your Gradifi account.";
  }
  if (message.includes("AUTH_IDENTITY_ALREADY_PROVISIONED")) {
    return "This sign-in is already linked to a different Gradifi identity. Sign in with the existing account.";
  }
  if (message.includes("REGISTRATION_EMAIL_SESSION_MISMATCH")) {
    return "The signed-in email does not match the email used to start this registration.";
  }
  if (message.includes("PENDING_INDIVIDUAL_REGISTRATION_NOT_FOUND")) {
    return "We could not recover the registration details. Start again or sign in to your existing account.";
  }
  if (message.includes("INDIVIDUAL_BOOTSTRAP_CONTRACT_MISMATCH")) {
    return "Gradifi could not verify the account setup response. Please try again.";
  }
  return message.replace(/^INDIVIDUAL_BOOTSTRAP_FAILED:\s*/, "");
};

export const IndividualRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<PublicIndividualAccountType>("freelancer");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const inFlightUsers = useRef(new Set<string>());
  const completedUsers = useRef(new Set<string>());

  const completeRegistration = useCallback(async (user: AuthUserForOnboarding) => {
    if (!user.id || completedUsers.current.has(user.id) || inFlightUsers.current.has(user.id)) {
      return;
    }

    const details = getProvisioningDetails(user);
    if ("error" in details) {
      if (details.error !== "PENDING_INDIVIDUAL_REGISTRATION_NOT_FOUND") {
        setError(getFriendlyError(details.error));
      }
      return;
    }

    inFlightUsers.current.add(user.id);
    setLoading(true);
    setError("");

    try {
      await individualOnboardingService.completePublicIndividualRegistration({
        authUserId: user.id,
        fullName: details.fullName,
        accountType: details.accountType,
      });
      completedUsers.current.add(user.id);

      const pending = readPendingRegistration();
      if (!pending || pending.email === details.email) {
        localStorage.removeItem(PENDING_KEY);
      }

      setNotice("Your independent Gradifi identity is ready.");
      navigate("/portal/individual", { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Account setup failed.";
      setError(getFriendlyError(message));
    } finally {
      inFlightUsers.current.delete(user.id);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || sessionError || !data.session?.user) return;
      void completeRegistration(data.session.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      queueMicrotask(() => {
        if (active) void completeRegistration(session.user);
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [completeRegistration]);

  const validateStep = () => {
    setError("");
    if (step === 1 && !isPublicAccountType(accountType)) {
      setError("Choose a valid Gradifi account category.");
      return false;
    }
    if (step === 2) {
      if (!fullName.trim()) {
        setError("Enter your full name.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return false;
      }
    }
    if (step === 3) {
      if (password.length < 10) {
        setError("Use a password with at least 10 characters.");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return false;
      }
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateStep()) return;
    setStep(current => Math.min(3, current + 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 3 || !validateStep()) return;

    const normalizedEmail = email.trim().toLowerCase();
    const pending: PendingRegistration = {
      full_name: fullName.trim().replace(/\s+/g, " "),
      email: normalizedEmail,
      account_type: accountType,
    };

    setLoading(true);
    setNotice("");
    setError("");
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    try {
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

      if (signupError) {
        localStorage.removeItem(PENDING_KEY);
        setError(signupError.message);
        return;
      }

      if (data.session && data.user) {
        await completeRegistration(data.user);
      } else {
        setNotice(
          "Check your email and confirm your address. Gradifi will finish creating your independent account when you return through the confirmation link.",
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration could not be started.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accountOptions.find(option => option.value === accountType);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link to="/onboarding/start" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
          <ArrowLeft className="h-4 w-4" /> All registration paths
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-6 py-7 sm:px-9">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Gradifi independent onboarding</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Create your Gradifi account</h1>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Set up an independent account for your work and verification needs. No school, university or institutional administrator is required.
            </p>
          </div>

          <div className="px-6 pt-6 sm:px-9">
            <nav aria-label="Onboarding progress" className="grid grid-cols-3 gap-2">
              {[
                { number: 1, label: "Account type" },
                { number: 2, label: "Your details" },
                { number: 3, label: "Secure account" },
              ].map(item => (
                <div key={item.number} className="min-w-0">
                  <div className={`h-1.5 rounded-full ${step >= item.number ? "bg-indigo-600" : "bg-slate-200"}`} />
                  <p className={`mt-2 text-xs font-semibold ${step >= item.number ? "text-indigo-700" : "text-slate-400"}`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-7 sm:px-9 sm:py-8">
            {step === 1 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Step 1 of 3</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">How will you use Gradifi?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Freelancer is selected by default. You can choose another independent account category if it describes you better.</p>
                <label htmlFor="individual-account-type" className="mt-6 block text-sm font-semibold text-slate-700">I am joining as</label>
                <select
                  id="individual-account-type"
                  value={accountType}
                  onChange={event => setAccountType(event.target.value as PublicIndividualAccountType)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  {accountOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{selectedAccount?.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedAccount?.description}</p>
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
                  <p className="text-xs leading-5 text-indigo-900">Your account category is saved by Gradifi's trusted onboarding function. The browser cannot assign your role or institution authority.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Step 2 of 3</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Tell us who you are</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use the name and email address you want associated with your Gradifi identity.</p>
                <div className="mt-6 space-y-5">
                  <label htmlFor="individual-full-name" className="block text-sm font-semibold text-slate-700">
                    Full name
                    <input
                      id="individual-full-name"
                      value={fullName}
                      onChange={event => setFullName(event.target.value)}
                      autoComplete="name"
                      required
                      maxLength={160}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      placeholder="e.g. Amina Okafor"
                    />
                  </label>
                  <label htmlFor="individual-email" className="block text-sm font-semibold text-slate-700">
                    Email address
                    <input
                      id="individual-email"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      maxLength={254}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      placeholder="you@example.com"
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Step 3 of 3</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Secure your account</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Create a password, review your details and confirm your email to activate your independent identity.</p>
                <div className="mt-6 space-y-4">
                  <label htmlFor="individual-password" className="block text-sm font-semibold text-slate-700">
                    Password
                    <input
                      id="individual-password"
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={10}
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <span className="mt-1.5 block text-xs font-normal text-slate-500">Use at least 10 characters.</span>
                  </label>
                  <label htmlFor="individual-confirm-password" className="block text-sm font-semibold text-slate-700">
                    Confirm password
                    <input
                      id="individual-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={10}
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Registration review</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Account type</dt><dd className="text-right font-semibold text-slate-900">{selectedAccount?.label}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Full name</dt><dd className="text-right font-semibold text-slate-900">{fullName.trim() || "Not entered"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="break-all text-right font-semibold text-slate-900">{email.trim().toLowerCase() || "Not entered"}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-slate-500">Your independent account is created without an institution or school. Email confirmation is required before the database provisions your identity.</p>
                </div>
              </div>
            )}

            {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{notice}</div>}
            {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">{error}</div>}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => { setError(""); setStep(current => Math.max(1, current - 1)); }}
                disabled={step === 1 || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {loading ? "Creating your account…" : "Create independent account"}
                </button>
              )}
            </div>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered? <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-900">Sign in</Link>.
        </p>
      </div>
    </main>
  );
};

export default IndividualRegistration;
