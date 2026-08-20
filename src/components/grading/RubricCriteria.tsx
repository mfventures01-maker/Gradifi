import React, { useState } from 'react';
import { RubricCriteriaProps } from '../../types/phase4.types';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { ChevronDown, ChevronUp, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const RubricCriteria: React.FC<RubricCriteriaProps> = ({
  criteria,
  aiScores,
  teacherScores = {},
  onScoreChange,
  isEditable = true,
  showAuditTrail = true,
}) => {
  const [expandedCriterionId, setExpandedCriterionId] = useState<string | null>(criteria[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedCriterionId(expandedCriterionId === id ? null : id);
  };

  return (
    <div className="space-y-3.5">
      {criteria.map((item) => {
        const aiScore = aiScores[item.id] ?? 0;
        const teacherScore = teacherScores[item.id];
        const isOverridden = teacherScore !== undefined && teacherScore !== aiScore;
        const activeScore = teacherScore !== undefined ? teacherScore : aiScore;
        const isExpanded = expandedCriterionId === item.id;

        return (
          <div
            key={item.id}
            className={`rounded-2xl border transition-all ${
              isOverridden
                ? 'bg-amber-50/40 border-amber-300/80 shadow-xs'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            {/* Criterion Header Bar */}
            <div
              onClick={() => toggleExpand(item.id)}
              className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Rubric Criteria
                  </span>
                  {showAuditTrail && isOverridden && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      <Edit3 className="w-3 h-3 text-amber-600" />
                      Overridden
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
              </div>

              {/* Right Score Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-base font-extrabold text-slate-900 font-mono">
                    {activeScore}
                    <span className="text-xs text-slate-400 font-normal">/{item.maxScore}</span>
                  </div>
                  {isOverridden && (
                    <span className="text-[10px] text-slate-400 line-through font-mono">
                      AI: {aiScore}/{item.maxScore}
                    </span>
                  )}
                </div>

                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Expanded Adjustments & Details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                {isEditable && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        Teacher Score Slider Override
                      </span>
                      <span className="font-mono text-indigo-600 font-bold">{activeScore} Marks</span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={item.maxScore}
                      value={activeScore}
                      onChange={(e) => onScoreChange && onScoreChange(item.id, Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>0</span>
                      <span>Max: {item.maxScore}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
