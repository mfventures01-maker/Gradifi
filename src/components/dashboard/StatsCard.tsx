/**
 * GRADIFI / SEFAES - STATS CARD COMPONENT
 * Reusable metric display card with trends, icons, loading skeletons, and accessible labels.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatsCardProps {
  id?: string;
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  loading?: boolean;
  colorScheme?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'slate';
  onClick?: () => void;
}

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    iconBg: 'bg-emerald-100 text-emerald-700',
    trendPos: 'text-emerald-700 bg-emerald-50',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-800 border-amber-100',
    iconBg: 'bg-amber-100 text-amber-800',
    trendPos: 'text-amber-800 bg-amber-50',
  },
  blue: {
    bg: 'bg-blue-50 text-blue-700 border-blue-100',
    iconBg: 'bg-blue-100 text-blue-700',
    trendPos: 'text-blue-700 bg-blue-50',
  },
  purple: {
    bg: 'bg-purple-50 text-purple-700 border-purple-100',
    iconBg: 'bg-purple-100 text-purple-700',
    trendPos: 'text-purple-700 bg-purple-50',
  },
  rose: {
    bg: 'bg-rose-50 text-rose-700 border-rose-100',
    iconBg: 'bg-rose-100 text-rose-700',
    trendPos: 'text-rose-700 bg-rose-50',
  },
  slate: {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-700',
    trendPos: 'text-slate-700 bg-slate-100',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  id,
  title,
  value,
  icon,
  trend,
  trendLabel = 'vs last term',
  subtitle,
  loading = false,
  colorScheme = 'emerald',
  onClick,
}) => {
  const scheme = colorStyles[colorScheme] || colorStyles.emerald;

  if (loading) {
    return (
      <div
        id={id}
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between h-36"
        aria-busy="true"
        aria-label={`Loading ${title}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-24" />
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        </div>
        <div>
          <div className="h-8 bg-slate-200 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
      role="region"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider line-clamp-1">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
          {value}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {trend !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                trend > 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : trend < 0
                  ? 'text-rose-700 bg-rose-50'
                  : 'text-slate-600 bg-slate-100'
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}

          {subtitle ? (
            <span className="text-slate-500">{subtitle}</span>
          ) : trend !== undefined ? (
            <span className="text-slate-400">{trendLabel}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
