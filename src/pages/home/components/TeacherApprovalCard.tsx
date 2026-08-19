import React, { useState } from "react";
import { Check, Edit3, Sparkles, UserCheck } from "lucide-react";

export default function TeacherApprovalCard() {
  const [thesisScore, setThesisScore] = useState(28);
  const [evidenceScore, setEvidenceScore] = useState(32);
  const [grammarScore, setGrammarScore] = useState(28);
  const [isEditing, setIsEditing] = useState(false);

  const totalScore = Number(thesisScore) + Number(evidenceScore) + Number(grammarScore);

  return (
    <section className="w-full py-12 px-4 flex flex-col items-center justify-center bg-slate-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all">
        {/* Top Status Bar */}
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white">Gradifi AI Draft Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Confidence: <strong className="text-white">High (96%)</strong></span>
          </div>
        </div>

        {/* Student & Submission Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
              AP Literature Essay #3
            </span>
            <h3 className="text-lg font-bold text-slate-800">
              Marcus Vance — <span className="font-normal text-slate-500">"The Great Gatsby Symbolism"</span>
            </h3>
          </div>
          <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between">
            <span className="text-xs text-slate-400 font-medium">Proposed Grade</span>
            <span className="text-2xl font-black text-slate-900">
              {totalScore}<span className="text-sm font-semibold text-slate-400">/100</span>
            </span>
          </div>
        </div>

        {/* Rubric Breakdown (Editable Proof) */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          {/* Rubric Row 1 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">Thesis & Argumentation</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Rubric Criteria</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clear central claim; strong contextualization of the green light motif.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <input
                type="number"
                value={thesisScore}
                onChange={(e) => setThesisScore(Number(e.target.value))}
                className="w-8 text-sm font-bold text-right bg-transparent text-slate-800 focus:outline-none focus:text-indigo-600"
              />
              <span className="text-xs font-medium text-slate-400">/30</span>
            </div>
          </div>

          {/* Rubric Row 2 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">Evidence & Textual Support</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Rubric Criteria</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct quotes integrated cleanly in paragraphs 2 and 4. Minor citation format issue.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <input
                type="number"
                value={evidenceScore}
                onChange={(e) => setEvidenceScore(Number(e.target.value))}
                className="w-8 text-sm font-bold text-right bg-transparent text-slate-800 focus:outline-none focus:text-indigo-600"
              />
              <span className="text-xs font-medium text-slate-400">/35</span>
            </div>
          </div>

          {/* Rubric Row 3 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">Structure & Mechanics</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Rubric Criteria</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Flawless transitions and varied sentence structure throughout.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <input
                type="number"
                value={grammarScore}
                onChange={(e) => setGrammarScore(Number(e.target.value))}
                className="w-8 text-sm font-bold text-right bg-transparent text-slate-800 focus:outline-none focus:text-indigo-600"
              />
              <span className="text-xs font-medium text-slate-400">/35</span>
            </div>
          </div>
        </div>

        {/* Human-in-the-Loop Action Bar */}
        <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&auto=format&fit=crop"
              alt="Teacher avatar"
              className="w-10 h-10 rounded-full border-2 border-indigo-100 object-cover"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Ms. Davis</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-400">Teacher has final authority</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? "Done Adjusting" : "Override Grade"}
            </button>

            <button
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-200"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Approve & Release
            </button>
          </div>
        </div>
      </div>

      {/* Trust Subtext */}
      <p className="mt-4 text-xs text-center text-slate-500 max-w-md">
        Gradifi structures feedback and calculates criteria scores instantly. You review, tweak, and approve every release.
      </p>
    </section>
  );
}
