import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { analyticsStore } from '@/server/analytics-store';

export async function GET(req: NextRequest) {
  try {
    // In production, add secret header check e.g. req.headers.get('x-admin-key')
    const sessionList = sessionStateManager.getAllSessions();

    const totalSessions = sessionList.length;
    const completedSessions = sessionList.filter((s: any) => s.state === 'COMPLETED' || s.state === 'REVIEW' || s.resultToken).length;
    const paidSessions = sessionList.filter((s: any) => s.tier === 'paid_hd').length;
    const totalRevenueIdr = paidSessions * 15000;

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const conversionRate = completedSessions > 0 ? Math.round((paidSessions / completedSessions) * 100) : 0;
    const funnel = analyticsStore.getFunnelStats();
    const recentEvents = analyticsStore.getRecentEvents(20);

    return NextResponse.json({
      totalSessions,
      completedSessions,
      paidSessions,
      totalRevenueIdr,
      completionRate,
      conversionRate,
      funnel,
      recentEvents,
      recentSessions: sessionList.slice(-15).reverse(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
