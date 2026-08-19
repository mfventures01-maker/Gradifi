/**
 * GRADIFI / SEFAES - ACTIVITY FEED COMPONENT
 * Event timeline with status indicators, relative timestamps, type icons, and empty states.
 */

import React from 'react';
import { BookOpen, Award, UserCheck, CreditCard, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'grading' | 'exam' | 'student' | 'payment' | 'attendance' | 'alert' | 'general';
  title: string;
  description: string;
  timestamp: string;
  status?: 'pending' | 'approved' | 'completed' | 'processing' | 'failed';
  score?: number | null;
}

export interface ActivityFeedProps {
  id?: string;
  title?: string;
  activities: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  maxItems?: number;
  onViewAll?: () => void;
}

const typeIconMap = {
  grading: <Award className="w-4 h-4 text-emerald-600" />,
  exam: <BookOpen className="w-4 h-4 text-blue-600" />,
  student: <UserCheck className="w-4 h-4 text-purple-600" />,
  payment: <CreditCard className="w-4 h-4 text-amber-600" />,
  attendance: <Calendar className="w-4 h-4 text-indigo-600" />,
  alert: <AlertCircle className="w-4 h-4 text-rose-600" />,
  general: <Clock className="w-4 h-4 text-slate-600" />,
};

const statusBadgeMap = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  id,
  title = '📝 Recent Activity',
  activities,
  loading = false,
  emptyMessage = 'No recent activities recorded for this academic period.',
  maxItems = 6,
  onViewAll,
}) => {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div id={id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            {title}
          </h3>
          {onViewAll && activities.length > maxItems && (
            <button
              onClick={onViewAll}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              View all ({activities.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedActivities.map((act) => {
              const icon = typeIconMap[act.type] || typeIconMap.general;
              const badgeStyle = act.status ? statusBadgeMap[act.status] || '' : '';

              return (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3.5 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-slate-300">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-sm font-medium text-slate-900 truncate">
                        {act.title}
                      </h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                        {formatTime(act.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {act.status && (
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badgeStyle}`}
                        >
                          {act.status}
                        </span>
                      )}
                      {act.score !== undefined && act.score !== null && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Score: {act.score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
