import React from 'react';

export interface ActionItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  badge?: number | string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
}

interface QuickActionsProps {
  actions: ActionItem[];
  title?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, title = 'Quick Actions' }) => {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const isPrimary = action.variant === 'primary' || idx === 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={action.onClick}
              className={`relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer min-h-[84px] text-center ${
                isPrimary
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              {action.badge !== undefined && (
                <span
                  className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ring-2 ${
                    isPrimary
                      ? 'bg-rose-500 text-white ring-blue-600'
                      : 'bg-rose-600 text-white ring-white'
                  }`}
                >
                  {action.badge}
                </span>
              )}
              <Icon className={`w-5 h-5 mb-1.5 ${isPrimary ? 'text-white' : 'text-blue-600'}`} />
              <span className="text-xs font-semibold leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
