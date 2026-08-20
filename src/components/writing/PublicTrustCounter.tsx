import React, { useState, useEffect } from 'react';
import { Users, Award, Sparkles } from 'lucide-react';
import { publicCounterService } from '../../services/publicCounterService';

interface PublicTrustCounterProps {
  toolName: string;
  toolDisplayName: string;
  showDetailed?: boolean;
}

export const PublicTrustCounter: React.FC<PublicTrustCounterProps> = ({
  toolName,
  toolDisplayName,
  showDetailed = false
}) => {
  const [stats, setStats] = useState({
    totalRuns: '0',
    todayRuns: '0',
    thisWeekRuns: '0',
    totalRunsNumber: 0
  });
  const [totalUsage, setTotalUsage] = useState('0');

  useEffect(() => {
    const updateStats = () => {
      setStats(publicCounterService.getFormattedStats(toolName));
      setTotalUsage(publicCounterService.getFormattedTotalUsage());
    };

    updateStats();
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [toolName]);

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Trusted by Students & Educators
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Real-time usage of {toolDisplayName}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.totalRuns}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Total Runs</p>
        </div>
        <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xl sm:text-2xl font-extrabold text-blue-600 font-mono">
            {stats.todayRuns}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Today</p>
        </div>
        <div className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <p className="text-xl sm:text-2xl font-extrabold text-purple-600 font-mono">
            {stats.thisWeekRuns}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">This Week</p>
        </div>
      </div>

      {/* Total Platform Usage */}
      {showDetailed && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Total platform usage</span>
          </div>
          <span className="text-sm font-extrabold text-slate-800 font-mono">{totalUsage}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Live counter • Updated in real-time</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span className="font-bold text-emerald-600">100% Free</span>
      </div>
    </div>
  );
};
