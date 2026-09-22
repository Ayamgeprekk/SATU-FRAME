import { openDB, IDBPDatabase } from 'idb';

/**
 * P0-03: Crash-Loop Detection & iOS bfcache Resilience (PRD §10.4 & §12.6)
 *
 * Traditional sessionStorage is vulnerable to false crash positives when iOS Safari
 * restores from bfcache (persisted = true). Conversely, true iOS tab crashes clear
 * in-memory/sessionStorage.
 *
 * This module uses IndexedDB with a persistent crash counter:
 * - On render start: increment crash counter.
 * - On render success: reset crash counter to 0.
 * - On pageshow with e.persisted === true: recognize bfcache restore and reset false crash counts.
 * - If render_crash_count >= 2: declare true crash-loop and fall back to server-side render.
 */

const DB_NAME = 'sf_render_guard';
const STORE_NAME = 'guard_state';

class RenderCrashDetector {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private isBfcacheRestored = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          this.isBfcacheRestored = true;
          this.resetCrashCount().catch(() => {});
        }
      });
    }
  }

  private getDB(): Promise<IDBPDatabase> | null {
    if (typeof window === 'undefined') return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      }).catch(() => null as any);
    }
    return this.dbPromise;
  }

  public async recordRenderStart(sessionId: string): Promise<number> {
    if (this.isBfcacheRestored) {
      this.isBfcacheRestored = false;
      return 0;
    }

    try {
      const db = await this.getDB();
      if (db) {
        const count = ((await db.get(STORE_NAME, `crash_${sessionId}`)) || 0) + 1;
        await db.put(STORE_NAME, count, `crash_${sessionId}`);
        return count;
      }
    } catch {}
    return 1;
  }

  public async recordRenderSuccess(sessionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      if (db) {
        await db.put(STORE_NAME, 0, `crash_${sessionId}`);
      }
    } catch {}
  }

  public async resetCrashCount(): Promise<void> {
    try {
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.clear();
        await tx.done;
      }
    } catch {}
  }

  public async isCrashLoop(sessionId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      if (db) {
        const count = (await db.get(STORE_NAME, `crash_${sessionId}`)) || 0;
        return count >= 2;
      }
    } catch {}
    return false;
  }
}

export const renderCrashDetector = new RenderCrashDetector();
