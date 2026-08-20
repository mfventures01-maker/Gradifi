import React, { useState } from 'react';
import { GradeOverrideProps, OverrideData } from '../../types/phase4.types';
import { ShieldCheck, Edit3, Check, X, AlertCircle, History } from 'lucide-react';

export const GradeOverride: React.FC<GradeOverrideProps> = ({
  scriptId,
  studentName,
  aiScore,
  maxScore,
  currentGrade,
  onApprove,
  onReject,
  loading = false,
}) => {
  const [teacherScore, setTeacherScore] = useState<number>(aiScore);
  const [reason, setReason] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isChanged = teacherScore !== aiScore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChanged && !reason.trim()) {
      setError('Please provide a mandatory justification for overriding the AI score.');
      return;
    }

    const payload: OverrideData = {
      scriptId,
      teacherScore,
      reason: isChanged ? reason.trim() : 'Approved AI draft without score modification',
      approvedAt: new Date().toISOString(),
      approvedBy: 'Logged-in Teacher',
    };

    await onApprove(payload);
    setShowConfirm(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Teacher Authority & Grade Release</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
          Grade: {currentGrade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">AI Draft Score</span>
          <p className="text-lg font-extrabold text-slate-700 font-mono">
            {aiScore}<span className="text-xs text-slate-400 font-normal">/{maxScore}</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-600">Final Release Score</span>
          <p className="text-lg font-extrabold text-indigo-600 font-mono">
            {teacherScore}<span className="text-xs text-slate-400 font-normal">/{maxScore}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Adjust Final Grade ({studentName})</span>
            <span className="text-indigo-600 font-mono font-bold">{teacherScore} / {maxScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={maxScore}
            value={teacherScore}
            onChange={(e) => { setTeacherScore(Number(e.target.value)); setError(null); }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {isChanged && (
          <div className="space-y-1.5 animate-fadeIn">
            <label className="block text-xs font-semibold text-amber-800 flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Mandatory Override Justification
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Student provided implicit textual evidence in section 2 not caught by AI parser."
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(null); }}
              className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/40 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Reject Draft</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isChanged ? 'Override & Approve' : 'Approve & Release'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
