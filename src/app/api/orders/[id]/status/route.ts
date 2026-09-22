import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment/payment-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = paymentService.getOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    amountIdr: order.amountIdr,
    paidAt: order.paidAt,
  });
}
