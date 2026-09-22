import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment/payment-service';
import { sessionStateManager } from '@/server/state-machine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resultToken, packageId, idempotencyKey, clientReturnUrl } = body;

    if (!resultToken || !packageId) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const session =
      (await sessionStateManager.getSessionByResultTokenAsync(resultToken)) ||
      sessionStateManager.getSessionByResultToken(resultToken);
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const order = await paymentService.createOrder({
      sessionId: session.id,
      packageId,
      idempotencyKey: idempotencyKey || `idemp_${Date.now()}`,
      clientReturnUrl: clientReturnUrl || `http://localhost:3000/pay/return?t=${resultToken}`,
    });

    // P1-07: Lock raw photos TTL until order expires + 48 hours
    if (typeof (sessionStateManager as any).lockPhotosTtl === 'function') {
      sessionStateManager.lockPhotosTtl(session.id, order.expiresAt + 48 * 60 * 60 * 1000);
    }

    return NextResponse.json(order);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat order' }, { status: 500 });
  }
}
