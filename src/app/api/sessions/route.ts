import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { roomCreationLimiter } from '@/server/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateCheck = roomCreationLimiter.check(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Batas pembuatan room tercapai. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateCheck.resetInMs / 1000).toString(),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const templateId = body.templateId || 'classic_strip';

    const { session, creatorToken } = await sessionStateManager.createSessionAsync(templateId);

    // If session was created using couple timeline quota (PRD §5.1)
    if (body.timelineId) {
      const { timelineStore } = await import('@/server/timeline-store');
      const deducted = timelineStore.deductQuota(body.timelineId);
      if (deducted) {
        session.tier = 'paid_hd';
        session.maxRetake = 3;
      }
    }

    return NextResponse.json({
      session,
      roomCode: session.roomCode,
      creatorToken,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat sesi' }, { status: 500 });
  }
}
