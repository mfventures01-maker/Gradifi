import React from 'react';
import { ActivityItem } from '../../types/phase3.types';
import { CheckCircle2, Clock, MessageSquare, AlertCircle, FileText, Calendar } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title = 'Recent Activity',
  loading = false,
}) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'grading':
        return FileText;
      case 'exam':
        return Calendar;
      case 'message':
        return MessageSquare;
      case 'attendance':
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  const getStatusBadge = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'approved':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 animate-pulse">
        <div className="w-32 h-4 bg-slate-200 rounded-md mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-3 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      {activities.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">No recent activity recorded.</p>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          {activities.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div key={item.id} className="relative flex items-start justify-between gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-100 border-2 border-white text-blue-600 flex items-center justify-center">
                  <Icon className="w-3 h-3" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{item.timestamp}</span>
                </div>
                {item.status && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
