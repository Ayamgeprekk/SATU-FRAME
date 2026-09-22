import { openDB, IDBPDatabase } from 'idb';

export interface LocalShotRecord {
  id: string; // `${sessionId}_${shotNo}_${participantId}`
  sessionId: string;
  shotNo: number;
  participantId: string;
  blob: Blob;
  status: 'LOCAL_ONLY' | 'SYNCED';
  createdAt: number;
}

const DB_NAME = 'satu_frame_local_store';
const STORE_NAME = 'shots';

class LocalShotStorage {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private memoryFallback = new Map<string, LocalShotRecord>();

  private getDB(): Promise<IDBPDatabase> | null {
    if (typeof window === 'undefined') return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('sessionId', 'sessionId', { unique: false });
          }
        },
      }).catch((err) => {
        console.warn('IndexedDB unavailable, falling back to in-memory storage:', err);
        return null as any;
      });
    }
    return this.dbPromise;
  }

  public async saveShot(
    sessionId: string,
    shotNo: number,
    participantId: string,
    blob: Blob
  ): Promise<string> {
    const id = `${sessionId}_${shotNo}_${participantId}`;
    const record: LocalShotRecord = {
      id,
      sessionId,
      shotNo,
      participantId,
      blob,
      status: 'LOCAL_ONLY',
      createdAt: Date.now(),
    };

    // P0-04: Explicit transaction scoping with tx.done acknowledgment
    try {
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.put(record);
        await tx.done; // Wait for transaction completion on disk
        return id;
      }
    } catch (err) {
      // Safari Private Mode (0-byte quota) or low storage fallback
      console.warn('IDB write failed (Private mode or QuotaExceeded), using memory fallback:', err);
    }

    this.memoryFallback.set(id, record);

    // Save session storage backup metadata if window is available
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(`sf_shot_cached_${id}`, String(Date.now()));
      } catch {}
    }

    return id;
  }

  public async markSynced(sessionId: string, shotNo: number, participantId: string): Promise<void> {
    const id = `${sessionId}_${shotNo}_${participantId}`;
    try {
      const db = await this.getDB();
      if (db) {
        const item = await db.get(STORE_NAME, id);
        if (item) {
          item.status = 'SYNCED';
          await db.put(STORE_NAME, item);
          return;
        }
      }
    } catch {}

    const mem = this.memoryFallback.get(id);
    if (mem) {
      mem.status = 'SYNCED';
    }
  }

  public async getUnsyncedShots(sessionId: string): Promise<LocalShotRecord[]> {
    try {
      const db = await this.getDB();
      if (db) {
        const all = await db.getAllFromIndex(STORE_NAME, 'sessionId', sessionId);
        return all.filter((s) => s.status === 'LOCAL_ONLY');
      }
    } catch {}

    return Array.from(this.memoryFallback.values()).filter(
      (s) => s.sessionId === sessionId && s.status === 'LOCAL_ONLY'
    );
  }

  public async getShot(sessionId: string, shotNo: number, participantId: string): Promise<LocalShotRecord | null> {
    const id = `${sessionId}_${shotNo}_${participantId}`;
    try {
      const db = await this.getDB();
      if (db) {
        const item = await db.get(STORE_NAME, id);
        if (item) return item;
      }
    } catch {}

    return this.memoryFallback.get(id) || null;
  }

  public async clearSessionShots(sessionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const index = tx.store.index('sessionId');
        let cursor = await index.openCursor(sessionId);
        while (cursor) {
          await cursor.delete();
          cursor = await cursor.continue();
        }
        await tx.done;
      }
    } catch {}

    for (const [key, val] of this.memoryFallback.entries()) {
      if (val.sessionId === sessionId) {
        this.memoryFallback.delete(key);
      }
    }
  }
}

export const localShotStorage = new LocalShotStorage();
