import React, { useState, useEffect } from 'react';
import { ExamTimerProps } from '../../types/phase4.types';
import { Clock, AlertTriangle } from 'lucide-react';

export const ExamTimer: React.FC<ExamTimerProps> = ({
  duration,
  onTimeUp,
  onTick,
  autoSubmit = true,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(duration * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        const next = prev - 1;
        if (onTick) onTick(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, onTimeUp, onTick]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = minutes < 2;
  const isWarningTime = minutes >= 2 && minutes < 5;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold transition-all ${
        isLowTime
          ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-md shadow-rose-600/30'
          : isWarningTime
          ? 'bg-amber-500 text-white border-amber-600'
          : 'bg-slate-900 text-white border-slate-800'
      }`}
      aria-label={`Exam Timer Remaining: ${formattedTime}`}
    >
      {isLowTime ? (
        <AlertTriangle className="w-3.5 h-3.5 text-white animate-bounce" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-emerald-400" />
      )}
      <span>⏱️ {formattedTime}</span>
    </div>
  );
};
