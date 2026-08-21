/**
 * GRADIFI / SEFAES - OFFLINE SYNC SERVICE
 * Background sync engine for offline-first data
 * Constitutional Law 8: Build Engines, Not Pages
 */

import { supabase } from '../lib/supabase';
import { offlineStorage, OfflineQueueItem } from './offlineStorageService';

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
  success: boolean;
}

export const offlineSyncService = {
  /**
   * Check if the user is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingSync: number;
    lastSyncAt: string | null;
  }> {
    const stats = await offlineStorage.getSyncStats();
    const lastSyncAt = localStorage.getItem('lastSyncAt');
    return {
      isOnline: this.isOnline(),
      pendingSync: stats.pending,
      lastSyncAt: lastSyncAt || null
    };
  },

  /**
   * Sync pending operations to Supabase
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        synced: 0,
        failed: 0,
        errors: ['User is offline'],
        success: false
      };
    }

    const queue = await offlineStorage.getPendingQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, errors: [], success: true };
    }

    console.log(`[Sync] Syncing ${queue.length} pending items...`);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of queue) {
      try {
        await this.processSyncItem(item);
        await offlineStorage.markSynced(item.id);
        synced++;
        console.log(`[Sync] ✅ Synced: ${item.table} (${item.action})`);
      } catch (error: any) {
        failed++;
        errors.push(`Failed to sync ${item.table} (${item.action}): ${error.message}`);
        console.error(`[Sync] ❌ Failed: ${item.table} (${item.action})`, error);
        
        // Increment retry count
        item.retryCount += 1;
        if (item.retryCount < 5) {
          // Keep in queue for retry
          try {
            await (offlineStorage as any).db?.put('queue', item);
          } catch {}
        }
      }
    }

    // Update last sync time
    if (synced > 0) {
      localStorage.setItem('lastSyncAt', new Date().toISOString());
      localStorage.setItem('lastSyncTime', Date.now().toString());
    }

    console.log(`[Sync] Complete: ${synced} synced, ${failed} failed`);

    return {
      synced,
      failed,
      errors,
      success: failed === 0
    };
  },

  /**
   * Process a single sync item
   */
  async processSyncItem(item: OfflineQueueItem): Promise<void> {
    const { table, action, data } = item;

    switch (action) {
      case 'create':
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw createError;
        break;
      
      case 'update':
        const { error: updateError } = await supabase.from(table).update(data).eq('id', data.id);
        if (updateError) throw updateError;
        break;
      
      case 'delete':
        const { error: deleteError } = await supabase.from(table).delete().eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },

  /**
   * Register online/offline event listeners
   */
  registerListeners(): void {
    // Sync when coming back online
    window.addEventListener('online', async () => {
      console.log('[Sync] Online detected - syncing...');
      const result = await this.syncAll();
      console.log(`[Sync] ${result.synced} items synced`);
    });

    // Periodic sync every 30 seconds when online
    setInterval(async () => {
      if (this.isOnline()) {
        const stats = await offlineStorage.getSyncStats();
        if (stats.pending > 0) {
          const result = await this.syncAll();
          if (result.synced > 0) {
            console.log(`[Sync] Periodic sync: ${result.synced} items synced`);
          }
        }
      }
    }, 30000); // 30 seconds
  },

  /**
   * Retry failed sync items
   */
  async retryFailed(): Promise<SyncResult> {
    return await this.syncAll();
  },

  /**
   * Get sync progress
   */
  async getSyncProgress(): Promise<{ pending: number; total: number; progress: number }> {
    const stats = await offlineStorage.getSyncStats();
    const total = stats.total;
    const pending = stats.pending;
    const completed = total - pending;
    return {
      pending,
      total,
      progress: total > 0 ? (completed / total) * 100 : 0
    };
  }
};
