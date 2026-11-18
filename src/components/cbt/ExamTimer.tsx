import React, { useEffect, useRef, useState } from 'react';
import { ExamTimerProps } from '../../types/phase4.types';
import { Clock, AlertTriangle } from 'lucide-react';

export const ExamTimer: React.FC<ExamTimerProps> = ({
  duration,
  deadlineAt,
  onTimeUp,
  onTick,
}) => {
  const calculateRemaining = () => deadlineAt
    ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.now()) / 1000))
    : Math.max(0, duration * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateRemaining);
  const timeUpFired = useRef(false);

  useEffect(() => {
    timeUpFired.current = false;
    const tick = () => {
      const next = calculateRemaining();
      setSecondsRemaining(next);
      onTick?.(next);
      if (next === 0 && !timeUpFired.current) {
        timeUpFired.current = true;
        onTimeUp?.();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAt, duration, onTimeUp, onTick]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  const isLowTime = minutes < 2;
  const isWarningTime = minutes >= 2 && minutes < 5;

  return (
    <div
      className={'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold transition-all ' +
        (isLowTime ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-md shadow-rose-600/30'
          : isWarningTime ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-900 text-white border-slate-800')}
      aria-label={'Exam Timer Remaining: ' + formattedTime}
      role="timer"
    >
      {isLowTime ? <AlertTriangle className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3.5 h-3.5 text-emerald-400" />}
      <span>{formattedTime}</span>
    </div>
  );
};
