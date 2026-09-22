import { AnalyticsEvent, AnalyticsEventName, FunnelStats } from '@/types/analytics';
import { v4 as uuidv4 } from 'uuid';

/**
 * Server Analytics Store (PRD §18)
 * Stores funnel and synchronization telemetry with in-memory bounded capacity.
 */
class AnalyticsStore {
  private events: AnalyticsEvent[] = [];
  private readonly maxCapacity = 10000;

  public recordEvent(
    eventName: AnalyticsEventName,
    sessionId?: string,
    participantId?: string,
    properties?: Record<string, any>
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      eventName,
      sessionId,
      participantId,
      properties: properties || {},
      timestamp: Date.now(),
    };

    this.events.push(event);
    if (this.events.length > this.maxCapacity) {
      this.events.shift(); // Evict oldest
    }

    return event;
  }

  public getFunnelStats(): FunnelStats {
    const counts: Record<AnalyticsEventName, number> = {
      landing_view: 0,
      create_room: 0,
      partner_join: 0,
      device_check_pass: 0,
      ready_both: 0,
      shot_captured: 0,
      shot_desync: 0,
      paywall_view: 0,
      pay_paid: 0,
      download_free: 0,
      download_hd: 0,
    };

    let totalDesyncMs = 0;
    let desyncSampleCount = 0;

    for (const evt of this.events) {
      if (counts[evt.eventName] !== undefined) {
        counts[evt.eventName] += 1;
      }

      if (evt.eventName === 'shot_captured' || evt.eventName === 'shot_desync') {
        const delta = evt.properties?.deltaMs;
        if (typeof delta === 'number' && !isNaN(delta)) {
          totalDesyncMs += Math.abs(delta);
          desyncSampleCount += 1;
        }
      }
    }

    const avgDesyncMs =
      desyncSampleCount > 0 ? Math.round(totalDesyncMs / desyncSampleCount) : 0;

    return {
      landingView: counts.landing_view,
      createRoom: counts.create_room,
      partnerJoin: counts.partner_join,
      deviceCheckPass: counts.device_check_pass,
      readyBoth: counts.ready_both,
      shotCaptured: counts.shot_captured,
      shotDesync: counts.shot_desync,
      paywallView: counts.paywall_view,
      payPaid: counts.pay_paid,
      downloadFree: counts.download_free,
      downloadHd: counts.download_hd,
      avgDesyncMs,
    };
  }

  public getRecentEvents(limit = 50): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse();
  }
}

const globalForAnalytics = globalThis as unknown as {
  analyticsStore: AnalyticsStore | undefined;
};

export const analyticsStore =
  globalForAnalytics.analyticsStore ?? new AnalyticsStore();

globalForAnalytics.analyticsStore = analyticsStore;
