import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore } from '@/server/analytics-store';
import { AnalyticsEventName } from '@/types/analytics';

export const dynamic = 'force-dynamic';

const VALID_EVENT_NAMES: Set<string> = new Set([
  'landing_view',
  'create_room',
  'partner_join',
  'device_check_pass',
  'ready_both',
  'shot_captured',
  'shot_desync',
  'paywall_view',
  'pay_paid',
  'download_free',
  'download_hd',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventName, sessionId, participantId, properties } = body;

    if (!eventName || !VALID_EVENT_NAMES.has(eventName)) {
      return NextResponse.json({ error: 'Invalid eventName' }, { status: 400 });
    }

    const recorded = analyticsStore.recordEvent(
      eventName as AnalyticsEventName,
      sessionId,
      participantId,
      properties
    );

    return NextResponse.json({ success: true, eventId: recorded.id });
  } catch (err: any) {
    console.error('Error logging analytics event:', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
