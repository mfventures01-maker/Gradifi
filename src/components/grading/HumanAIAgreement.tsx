import React from 'react';
import { HumanAIAgreementProps } from '../../types/phase4.types';
import { TrendingUp, CheckCircle2, Edit3, XCircle, Sparkles } from 'lucide-react';

export const HumanAIAgreement: React.FC<HumanAIAgreementProps> = ({
  stats,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4">
        <div className="w-40 h-4 bg-slate-200 rounded-md" />
        <div className="w-24 h-8 bg-slate-300 rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Human-AI Agreement Calibration</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Teacher validation rate vs AI scoring engine predictions
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+{stats.trend}% this term</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Scripts</span>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{stats.totalGraded}</p>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Agreed (Accepted)</span>
          <p className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">{stats.agreed}</p>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Overridden</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono mt-0.5">{stats.overridden}</p>
        </div>

        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Rejected</span>
          <p className="text-xl font-extrabold text-rose-700 font-mono mt-0.5">{stats.rejected}</p>
        </div>
      </div>

      {/* Progress Bar Visual */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">Overall Agreement Rate</span>
          <span className="font-mono text-indigo-600 font-bold">{stats.agreementRate}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${stats.agreementRate}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
          />
          <div
            style={{ width: `${(stats.overridden / stats.totalGraded) * 100}%` }}
            className="bg-amber-400 h-full"
          />
          <div
            style={{ width: `${(stats.rejected / stats.totalGraded) * 100}%` }}
            className="bg-rose-500 h-full"
          />
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Agreement by Rubric Category</h4>
        <div className="space-y-2 text-xs">
          {Object.entries(stats.criteriaBreakdown).map(([cat, rate]) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">{cat}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${rate}%` }} className="bg-indigo-600 h-full" />
                </div>
                <span className="font-mono font-bold text-slate-800 w-8 text-right">{rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
