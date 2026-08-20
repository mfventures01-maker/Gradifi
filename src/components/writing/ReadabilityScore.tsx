import React from 'react';
import { ReadabilityScores, TextComplexity } from '../../types/phase5.types';
import { BookOpen, Award, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ReadabilityScoreProps {
  scores: ReadabilityScores;
  complexity: TextComplexity;
  className?: string;
}

export const ReadabilityScore: React.FC<ReadabilityScoreProps> = ({
  scores,
  complexity,
  className = ''
}) => {
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'advanced':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Readability & Grade Level Breakdown</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">{complexity.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${getLevelBadge(complexity.level)}`}>
          {complexity.level} Level
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reading Ease</span>
          <p className="text-xl font-extrabold text-indigo-600 font-mono mt-0.5">{scores.fleschReadingEase}</p>
          <span className="text-[10px] text-slate-400">/ 100</span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FK Grade Level</span>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{scores.fleschKincaidGrade}</p>
          <span className="text-[10px] text-slate-400">Grade</span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMOG Index</span>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{scores.smogIndex}</p>
          <span className="text-[10px] text-slate-400">Years</span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Grade</span>
          <p className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">{scores.averageGradeLevel}</p>
          <span className="text-[10px] text-slate-400">Composite</span>
        </div>
      </div>
    </div>
  );
};
