/**
 * Lapis 1: Clock offset & Time Synchronization (NTP-style ping-pong)
 * Uses monotonic performance.now() to prevent system clock jump anomalies.
 * Minimum 8 samples, sorts by RTT, takes median of top 5 lowest RTT samples.
 */

export interface TimeSample {
  t0: number; // Client send time (performance.now())
  ts: number; // Server time
  t1: number; // Client receive time (performance.now())
  rtt: number;
  offset: number;
}

export class TimeSyncClient {
  private samples: TimeSample[] = [];
  private currentOffset = 0;
  private currentRtt = 0;
  private isSynced = false;
  private lastSyncTime = 0;
  private syncIntervalTimer: any = null;

  constructor(
    private sendPing: (clientTime: number) => void,
    private onSyncChange?: (offset: number, rtt: number, isSynced: boolean) => void
  ) {}

  /**
   * Start initial sync round (sends 8 pings with slight delay)
   */
  public async startSync(sampleCount = 8): Promise<void> {
    this.samples = [];
    for (let i = 0; i < sampleCount; i++) {
      const t0 = performance.now();
      this.sendPing(t0);
      // Small pause between pings to avoid queue congestion
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  /**
   * Handle server pong message
   */
  public handlePong(t0: number, ts: number, t1Override?: number): void {
    const t1 = t1Override !== undefined ? t1Override : performance.now();
    const rtt = t1 - t0;
    // Estimated offset: serverTime - (clientMidpoint)
    const offset = ts - (t0 + rtt / 2);

    this.samples.push({ t0, ts, t1, rtt, offset });

    // Keep at most 16 recent samples
    if (this.samples.length > 16) {
      this.samples.shift();
    }

    this.recalculateOffset();
  }

  /**
   * Recalculate using median of top 5 lowest RTT samples (PRD §9.2)
   */
  private recalculateOffset(): void {
    if (this.samples.length < 3) {
      return;
    }

    // Sort by lowest RTT first (cleanest network hops)
    const sortedByRtt = [...this.samples].sort((a, b) => a.rtt - b.rtt);
    const bestSamples = sortedByRtt.slice(0, Math.min(5, sortedByRtt.length));

    // Sort the best samples by offset to pick median
    const sortedByOffset = [...bestSamples].sort((a, b) => a.offset - b.offset);
    const midIdx = Math.floor(sortedByOffset.length / 2);

    this.currentOffset = sortedByOffset[midIdx].offset;
    this.currentRtt = sortedByOffset[midIdx].rtt;
    this.isSynced = true;
    this.lastSyncTime = performance.now();

    if (this.onSyncChange) {
      this.onSyncChange(this.currentOffset, this.currentRtt, this.isSynced);
    }
  }

  /**
   * Returns current estimated server time based on monotonic performance.now()
   */
  public getEstimatedServerTime(): number {
    return performance.now() + this.currentOffset;
  }

  /**
   * Convert server timestamp to local performance.now() target
   */
  public serverToLocalTime(serverTargetTime: number): number {
    return serverTargetTime - this.currentOffset;
  }

  public getOffset(): number {
    return this.currentOffset;
  }

  public getRtt(): number {
    return this.currentRtt;
  }

  public getIsSynced(): boolean {
    // PRD: drift should be re-synced every 10s, marked out of sync if stale > 15s
    const isStale = performance.now() - this.lastSyncTime > 15000;
    return this.isSynced && !isStale;
  }

  /**
   * Start recurring background sync (every 10 seconds)
   */
  public startPeriodicSync(intervalMs = 10000): void {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    this.syncIntervalTimer = setInterval(() => {
      this.startSync(4); // 4 pings for periodic refresh
    }, intervalMs);
  }

  public stopPeriodicSync(): void {
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }
  }
}
