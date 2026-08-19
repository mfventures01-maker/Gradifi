/**
 * GRADIFI / SEFAES - QUICK ACTIONS COMPONENT
 * Operational shortcuts with badge indicators, tooltips, responsive grid layout, and keyboard accessibility.
 */

import React from 'react';

export interface QuickActionItem {
  id?: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number | string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue';
  disabled?: boolean;
}

export interface QuickActionsProps {
  id?: string;
  title?: string;
  actions: QuickActionItem[];
  columns?: 2 | 3 | 4;
}

const badgeColorMap = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const QuickActions: React.FC<QuickActionsProps> = ({
  id,
  title = '⚡ Quick Actions',
  actions,
  columns = 3,
}) => {
  const gridColsClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div id={id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      {title && (
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}

      <div className={`grid ${gridColsClass} gap-3`}>
        {actions.map((action, idx) => {
          const badgeClass =
            badgeColorMap[action.badgeColor || 'emerald'] || badgeColorMap.emerald;

          return (
            <button
              key={action.id || `action-${idx}`}
              id={action.id || `btn-quick-action-${idx}`}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`relative flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 text-left transition-all duration-150 group active:scale-[0.98] ${
                action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 group-hover:text-emerald-700 group-hover:border-emerald-300 shrink-0 transition-colors">
                {action.icon}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="text-sm font-medium text-slate-900 group-hover:text-emerald-950 truncate">
                  {action.label}
                </div>
                {action.description && (
                  <div className="text-xs text-slate-500 truncate">
                    {action.description}
                  </div>
                )}
              </div>

              {action.badge !== undefined && (
                <span
                  className={`absolute top-2.5 right-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${badgeClass}`}
                >
                  {action.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
