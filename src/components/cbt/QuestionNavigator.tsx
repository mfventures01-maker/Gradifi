import React from 'react';
import { QuestionNavigatorProps } from '../../types/phase4.types';
import { Flag, CheckCircle2 } from 'lucide-react';

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  flaggedQuestions,
  onQuestionSelect,
  isMobile = false,
}) => {
  const questionsArray = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Question Navigator</h4>
        <span className="text-[11px] font-semibold text-slate-500">
          {answeredQuestions.size} / {totalQuestions} Answered
        </span>
      </div>

      {/* Grid of Question Numbers */}
      <div
        className={`grid gap-2 ${
          isMobile ? 'grid-cols-5' : 'grid-cols-5 sm:grid-cols-8 md:grid-cols-10'
        }`}
      >
        {questionsArray.map((qNum) => {
          const isCurrent = qNum === currentQuestion;
          const isAnswered = answeredQuestions.has(qNum);
          const isFlagged = flaggedQuestions.has(qNum);

          let btnClass = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
          if (isCurrent) {
            btnClass = 'bg-blue-600 text-white border-blue-700 font-black ring-2 ring-blue-400';
          } else if (isFlagged) {
            btnClass = 'bg-amber-400 text-slate-950 border-amber-500 font-bold';
          } else if (isAnswered) {
            btnClass = 'bg-emerald-500 text-white border-emerald-600 font-bold';
          }

          return (
            <button
              key={qNum}
              type="button"
              onClick={() => onQuestionSelect(qNum)}
              className={`relative h-9 rounded-xl border text-xs font-mono flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
            >
              <span>{qNum}</span>
              {isFlagged && !isCurrent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-600 ring-1 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Flagged
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> Unanswered
        </span>
      </div>
    </div>
  );
};
