import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const accountLabels: Record<string, string> = {
  freelancer: "Freelancer",
  independent_student: "Independent student / learner",
  independent_professional: "Independent professional",
  other_individual: "Individual account",
};

export const IndividualDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("other_individual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.resolveCurrentIdentity().then(identity => {
      if (!identity.isAuthenticated || identity.role !== "individual" || !identity.profile) {
        navigate("/login", { replace: true });
        return;
      }
      setName(identity.profile.full_name || "Gradifi member");
      setAccountType((identity.profile as any).account_type || "other_individual");
    }).finally(() => setLoading(false));
  }, [navigate]);

  const signOut = async () => {
    await authService.signOut();
    navigate("/", { replace: true });
  };

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading your account…</main>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Gradifi individual workspace</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Welcome, {name}</h1>
        <p className="mt-3 text-slate-600">Your independent account is active. It is not attached to an institution, campus or institutional authority.</p>
        <div className="mt-7 rounded-xl bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Account category</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{accountLabels[accountType] || accountLabels.other_individual}</p>
          <p className="mt-2 text-sm text-slate-500">If you later join a participating school or higher institution, that institution must explicitly provision or link your institutional membership.</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <button onClick={() => navigate("/tools")} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Explore free tools</button>
          <button onClick={signOut} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Sign out</button>
        </div>
      </div>
    </main>
  );
};

export default IndividualDashboard;
