import React from 'react';
import { OfflineSyncStatusProps } from '../../types/phase4.types';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({
  pendingCount = 0,
  lastSyncAt = 'Just now',
  isOnline = true,
  onSync,
  syncing = false,
  autoSync = true,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
      <div className="flex items-center gap-2.5">
        {isOnline ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Working Offline</span>
          </div>
        )}

        <span className="text-slate-300 font-medium">
          {pendingCount > 0
            ? `${pendingCount} responses queued for sync`
            : 'All responses synced to local engine'}
        </span>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <span className="text-[10px] text-slate-400">Last synced: {lastSyncAt}</span>

        {onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
