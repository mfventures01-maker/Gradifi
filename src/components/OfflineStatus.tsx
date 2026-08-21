import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { offlineSyncService } from '../services/offlineSyncService';

export const OfflineStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await offlineSyncService.getSyncStatus();
      setIsOnline(status.isOnline);
      setPendingSync(status.pendingSync);
      setLastSyncAt(status.lastSyncAt);
    };

    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const result = await offlineSyncService.syncAll();
      const status = await offlineSyncService.getSyncStatus();
      setPendingSync(status.pendingSync);
      setLastSyncAt(status.lastSyncAt);
      if (result.success) {
        console.log(`✅ Synced ${result.synced} items`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-3 min-w-[160px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-slate-700">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-medium text-rose-700">Offline</span>
              </>
            )}
          </div>
          {pendingSync > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pendingSync}
            </span>
          )}
        </div>

        {lastSyncAt && (
          <div className="text-xs text-slate-400 mt-1">
            Last sync: {new Date(lastSyncAt).toLocaleTimeString()}
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className="mt-2 w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {!isOnline && (
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Working offline</span>
          </div>
        )}
      </div>
    </div>
  );
};
