import React from 'react';
import { ConfidenceIndicatorProps } from '../../types/phase4.types';
import { Sparkles, HelpCircle } from 'lucide-react';

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'md',
  showLabel = true,
  showTooltip = true,
  loading = false,
}) => {
  const clamped = Math.max(0, Math.min(100, confidence));

  const getColor = (val: number) => {
    if (val >= 80) return { stroke: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (val >= 60) return { stroke: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { stroke: '#ef4444', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const colorConfig = getColor(clamped);

  const radius = size === 'sm' ? 12 : size === 'lg' ? 24 : 18;
  const strokeWidth = size === 'sm' ? 2.5 : size === 'lg' ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-slate-200" />
        {showLabel && <div className="w-16 h-3 bg-slate-200 rounded-md" />}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 relative group"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`AI Confidence Score: ${clamped}%`}
    >
      <div className="relative inline-flex items-center justify-center">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={colorConfig.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute text-[10px] font-bold text-slate-800 font-mono">
          {clamped}%
        </span>
      </div>

      {showLabel && (
        <div className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${colorConfig.bg}`}>
            {clamped >= 80 ? 'High Confidence' : clamped >= 60 ? 'Moderate' : 'Low Confidence'}
          </span>
        </div>
      )}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 pointer-events-none">
          <div className="flex items-center gap-1 font-semibold text-amber-300 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Calibration Metric</span>
          </div>
          <p className="text-slate-300 leading-snug">
            Calculated via SEFAES multi-prompt agreement & statistical rubric alignment.
          </p>
        </div>
      )}
    </div>
  );
};
