import { AnalyticsEventName } from '@/types/analytics';

/**
 * Client Event Tracker (PRD §18)
 * Non-blocking beacon/fetch event sender for funnel & performance telemetry.
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  payload?: {
    sessionId?: string;
    participantId?: string;
    properties?: Record<string, any>;
  }
): void {
  if (typeof window === 'undefined') return;

  const data = {
    eventName,
    sessionId: payload?.sessionId,
    participantId: payload?.participantId,
    properties: payload?.properties || {},
    timestamp: Date.now(),
  };

  try {
    const jsonString = JSON.stringify(data);

    if (navigator.sendBeacon) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/analytics/events', blob);
      if (sent) return;
    }

    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
      keepalive: true,
    }).catch(() => {
      // Non-blocking telemetry
    });
  } catch {
    // Non-blocking
  }
}
