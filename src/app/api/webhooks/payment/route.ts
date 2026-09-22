import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment/payment-service';
import { sessionStateManager } from '@/server/state-machine';
import { renderPhotostripServer } from '@/server/server-renderer';
import { getUploadsDir, ensureDirExists, getStorageFilePath } from '@/server/storage-helper';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both Midtrans format and mock simulator format
    const orderId = body.order_id || body.orderId;
    const transactionStatus = body.transaction_status || body.status;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const isPaid =
      transactionStatus === 'settlement' ||
      transactionStatus === 'capture' ||
      transactionStatus === 'PAID';

    if (isPaid) {
      const order = paymentService.markOrderPaid(orderId);
      if (order) {
        const session = await sessionStateManager.getSessionAsync(order.sessionId);
        if (session) {
          session.tier = 'paid_hd';
          session.stateVersion += 1;

          // Pre-render HD clean photostrip (without watermark)
          try {
            const storageDir = getUploadsDir(session.id);
            ensureDirExists(storageDir);
            const fileName = `strip_paid_hd.jpg`;
            const filePath = path.join(storageDir, fileName);

            const photoBuffers: { slotIndex: number; buffer: Buffer }[] = [];
            const sessionPhotos = await sessionStateManager.getPhotosAsync(session.id);

            for (const p of sessionPhotos) {
              const pPath = getStorageFilePath(session.id, `${p.shotNo}_${p.participantId}.jpg`);
              if (fs.existsSync(pPath)) {
                const buf = fs.readFileSync(pPath);
                const isCreator = p.participantId === session.creatorParticipantId;
                const slotIdx = (p.shotNo - 1) * 2 + (isCreator ? 0 : 1);
                photoBuffers.push({ slotIndex: slotIdx, buffer: buf });
              }
            }

            const hdBuffer = await renderPhotostripServer({
              sessionId: session.id,
              templateId: session.templateId,
              photos: photoBuffers,
              watermark: false,
            });

            fs.writeFileSync(filePath, hdBuffer);
          } catch (renderErr) {
            console.error('HD pre-render error:', renderErr);
          }
        }
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
