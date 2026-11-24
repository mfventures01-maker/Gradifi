import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "allowed" | "denied" | "unauthenticated" | "error">("checking");

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          if (active) setState("unauthenticated");
          return;
        }
        const { data, error } = await supabase.rpc("is_current_user_super_admin");
        if (error) throw error;
        if (active) setState(data === true ? "allowed" : "denied");
      } catch (error) {
        console.error("Super Admin authorization check failed:", error);
        if (active) setState("error");
      }
    };
    void verify();
    return () => { active = false; };
  }, []);

  if (state === "checking") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p className="text-sm text-slate-600">Verifying platform administrator access…</p></main>;
  }
  if (state === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (state === "denied" || state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {state === "denied"
            ? <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
            : <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />}
          <h1 className="mt-4 text-xl font-bold text-slate-950">{state === "denied" ? "Platform administrator access required" : "Access check unavailable"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {state === "denied"
              ? "This account is not registered as an active Gradifi Super Admin. An ordinary institution administrator account cannot approve institutions."
              : "Gradifi could not verify platform administrator authority. No approval actions are available."}
          </p>
          <a href="/login" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Return to sign in</a>
        </section>
      </main>
    );
  }
  return <>{children}</>;
};
