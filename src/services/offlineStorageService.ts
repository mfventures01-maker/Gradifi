/**
 * GRADIFI / SEFAES - OFFLINE STORAGE SERVICE
 * IndexedDB wrapper for offline-first data persistence
 * Constitutional Law 8: Build Engines, Not Pages
 */

import { openDB, IDBPDatabase } from 'idb';

export interface OfflineQueueItem {
  id: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  synced: boolean;
}

export interface OfflineData {
  id: string;
  table: string;
  data: any;
  version: number;
  lastUpdated: number;
  synced: boolean;
}

class OfflineStorageService {
  private db: IDBPDatabase | null = null;
  private dbName = 'gradifi-offline';
  private dbVersion = 1;

  async initialize(): Promise<void> {
    this.db = await openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        // Data store for offline records
        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: 'id' });
          dataStore.createIndex('table', 'table');
          dataStore.createIndex('synced', 'synced');
        }

        // Queue store for pending sync operations
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('synced', 'synced');
          queueStore.createIndex('timestamp', 'timestamp');
        }

        // Cache store for API responses
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'url' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
      }
    });
    console.log('[OfflineStorage] Database initialized');
  }

  async saveData(table: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();

    const record: OfflineData = {
      id: data.id || crypto.randomUUID(),
      table,
      data,
      version: 1,
      lastUpdated: Date.now(),
      synced: false
    };

    await this.db!.put('data', record);
    await this.queueForSync(record.id, table, 'create', data);
  }

  async updateData(table: string, id: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();

    const record = await this.db!.get('data', id);
    if (record) {
      record.data = { ...record.data, ...data };
      record.version += 1;
      record.lastUpdated = Date.now();
      record.synced = false;
      await this.db!.put('data', record);
      await this.queueForSync(id, table, 'update', record.data);
    }
  }

  async getData(table: string, id: string): Promise<any | null> {
    if (!this.db) await this.initialize();
    const record = await this.db!.get('data', id);
    return record?.data || null;
  }

  async getAllData(table: string): Promise<any[]> {
    if (!this.db) await this.initialize();
    const records = await this.db!.getAllFromIndex('data', 'table', table);
    return records.map(r => r.data);
  }

  async deleteData(table: string, id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('data', id);
    await this.queueForSync(id, table, 'delete', { id });
  }

  private async queueForSync(id: string, table: string, action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (!this.db) await this.initialize();

    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID(),
      table,
      action,
      data: { ...data, id },
      timestamp: Date.now(),
      retryCount: 0,
      synced: false
    };

    await this.db!.add('queue', queueItem);
  }

  async getPendingQueue(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.initialize();
    try {
      const store = this.db!.transaction('queue', 'readonly').objectStore('queue');
      if (store.indexNames.contains('synced')) {
        try {
          return await this.db!.getAllFromIndex('queue', 'synced', false as any);
        } catch {
          const all = await this.db!.getAll('queue');
          return all.filter(item => !item.synced);
        }
      } else {
        const all = await this.db!.getAll('queue');
        return all.filter(item => !item.synced);
      }
    } catch (error) {
      console.warn('Failed to get pending queue:', error);
      return [];
    }
  }

  async markSynced(queueId: string): Promise<void> {
    if (!this.db) await this.initialize();
    const item = await this.db!.get('queue', queueId);
    if (item) {
      item.synced = true;
      await this.db!.put('queue', item);
    }
  }

  async markDataSynced(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    const record = await this.db!.get('data', id);
    if (record) {
      record.synced = true;
      await this.db!.put('data', record);
    }
  }

  async getSyncStats(): Promise<{ pending: number; total: number }> {
    if (!this.db) await this.initialize();
    try {
      const total = await this.db!.count('queue');
      let pending = 0;
      try {
        pending = await this.db!.countFromIndex('queue', 'synced', false as any);
      } catch {
        const all = await this.db!.getAll('queue');
        pending = all.filter(item => !item.synced).length;
      }
      return { pending, total };
    } catch (error) {
      console.warn('Failed to get sync stats:', error);
      return { pending: 0, total: 0 };
    }
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.clear('cache');
  }

  async cacheResponse(url: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('cache', {
      url,
      data,
      timestamp: Date.now()
    });
  }

  async getCachedResponse(url: string): Promise<any | null> {
    if (!this.db) await this.initialize();
    const entry = await this.db!.get('cache', url);
    return entry?.data || null;
  }
}

export const offlineStorage = new OfflineStorageService();
