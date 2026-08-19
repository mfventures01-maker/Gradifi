import React, { useState, useEffect } from "react";
import { Clock, TrendingUp, Sparkles } from "lucide-react";

export default function PrincipalTimeSavedCard() {
  const [hoursSaved, setHoursSaved] = useState(1024);

  // Auto-increment to simulate live school usage data
  useEffect(() => {
    const interval = setInterval(() => {
      setHoursSaved((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full py-8 px-4 flex flex-col items-center justify-center bg-transparent">
      <div className="w-full max-w-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-700/50 relative overflow-hidden">
        
        {/* Subtle Background Glow Accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5">
          
          {/* Principal Visual + Avatar Anchor */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                alt="Principal Smiling"
                className="w-16 h-16 rounded-2xl border-2 border-emerald-400/60 object-cover shadow-md"
              />
              <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] ring-2 ring-emerald-900">
                <Sparkles className="w-3 h-3 text-white" />
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network Impact
              </div>
              <h4 className="text-sm font-semibold text-slate-100">Alhaji M. Ibrahim</h4>
              <p className="text-xs text-emerald-200/80">Principal, Standard Academy</p>
            </div>
          </div>

          {/* Live Incremental Counter */}
          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto bg-emerald-950/40 sm:bg-transparent p-3.5 sm:p-0 rounded-2xl border sm:border-0 border-emerald-700/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Time Recovered</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                {hoursSaved.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-emerald-300">Hours</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-200/70 mt-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>+1 hr recorded every few mins</span>
            </div>
          </div>

        </div>

        {/* Impact Subtext */}
        <div className="mt-5 pt-4 border-t border-emerald-700/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-xs text-emerald-100 font-medium">
            “Gradifi cut our term-end broadsheet compilation from 3 weeks down to 1 afternoon.”
          </p>
          <span className="text-[11px] text-emerald-300/80 shrink-0 font-semibold tracking-wide uppercase">
            35+ Schools Active
          </span>
        </div>

      </div>
    </section>
  );
}
