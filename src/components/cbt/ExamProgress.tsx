import React from 'react';
import { ExamProgressProps } from '../../types/phase4.types';

export const ExamProgress: React.FC<ExamProgressProps> = ({
  current,
  total,
  title = 'CBT Examination',
  timeRemaining,
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-xs">
        <h3 className="font-bold text-slate-900 truncate max-w-[200px]">{title}</h3>
        <span className="font-mono font-bold text-indigo-600">
          Question {current} of {total} ({percentage}%)
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          style={{ width: `${percentage}%` }}
          className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
        />
      </div>
    </div>
  );
};
