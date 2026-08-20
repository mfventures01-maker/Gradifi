export const offlineSyncService = {
  getPendingSyncCount(): number {
    const pending = localStorage.getItem('gradifi_pending_sync_queue');
    if (!pending) return 0;
    try {
      return JSON.parse(pending).length;
    } catch {
      return 0;
    }
  },

  async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem('gradifi_pending_sync_queue');
        resolve({ success: true, syncedCount: 3 });
      }, 1200);
    });
  },

  queueForSync(action: string, payload: any) {
    const pendingStr = localStorage.getItem('gradifi_pending_sync_queue') || '[]';
    try {
      const queue = JSON.parse(pendingStr);
      queue.push({ action, payload, timestamp: new Date().toISOString() });
      localStorage.setItem('gradifi_pending_sync_queue', JSON.stringify(queue));
    } catch (e) {
      console.warn('Queue sync error:', e);
    }
  },
};
