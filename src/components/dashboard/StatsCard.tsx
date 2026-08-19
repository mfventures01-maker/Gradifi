import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: string;
    isUpward: boolean;
  };
  subtitle?: string;
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="w-24 h-4 bg-slate-200 rounded-md" />
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        </div>
        <div className="w-16 h-8 bg-slate-200 rounded-md mb-2" />
        <div className="w-32 h-3 bg-slate-100 rounded-md" />
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isUpward
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
            }`}
          >
            {trend.isUpward ? (
              <TrendingUp className="w-3 h-3 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-600" />
            )}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};
