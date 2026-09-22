import fs from 'fs';
import path from 'path';
import { sessionStateManager } from './state-machine';
import { roomCreationLimiter, photoUploadLimiter } from './rate-limiter';

/**
 * Background TTL & Session Storage Purge Job (PRD §11.5, §14.4 UU PDP)
 * Removes temporary unpersisted photos after session expiry or 24h TTL.
 */
export function runCleanupCycle(): {
  expiredSessionsCount: number;
  purgedStorageDirsCount: number;
} {
  const now = Date.now();
  const expiredSessions = sessionStateManager.getExpiredSessions(now);
  let purgedStorageDirsCount = 0;

  for (const session of expiredSessions) {
    // P1-07: Check if raw photos TTL is locked due to active payment order
    if (session.photosTtlLockedUntil && now < session.photosTtlLockedUntil) {
      continue; // Skip purging raw photos while order settlement grace period is active
    }

    sessionStateManager.expireSession(session.id);

    // If session is older than TTL or expired without payment, remove uploaded photo files
    const sessionUploadDir = path.join(process.cwd(), 'temp_uploads', session.id);
    if (fs.existsSync(sessionUploadDir)) {
      try {
        fs.rmSync(sessionUploadDir, { recursive: true, force: true });
        purgedStorageDirsCount += 1;
      } catch (err) {
        console.warn(`[Cleanup] Failed to remove storage directory for session ${session.id}:`, err);
      }
    }
  }

  // Rate limiter in-memory table cleanup
  roomCreationLimiter.cleanup();
  photoUploadLimiter.cleanup();

  return {
    expiredSessionsCount: expiredSessions.length,
    purgedStorageDirsCount,
  };
}

/**
 * Starts background timer in Node.js server.
 */
export function startBackgroundCleanupScheduler(intervalMs = 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(() => {
    try {
      const stats = runCleanupCycle();
      if (stats.expiredSessionsCount > 0 || stats.purgedStorageDirsCount > 0) {
        console.log(
          `[Cleanup] Expired: ${stats.expiredSessionsCount} sessions, Purged: ${stats.purgedStorageDirsCount} dirs`
        );
      }
    } catch (err) {
      console.error('[Cleanup] Error during periodic cleanup cycle:', err);
    }
  }, intervalMs);

  return timer;
}
