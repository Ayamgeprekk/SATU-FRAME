import { Order, OrderStatus, PaymentMethod } from '@/types/session';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrderParams {
  sessionId: string;
  packageId: '1_session' | '3_sessions';
  idempotencyKey: string;
  clientReturnUrl: string;
  method?: PaymentMethod;
}

export class PaymentService {
  private orders = new Map<string, Order>();
  private idempotencyMap = new Map<string, string>(); // idempotencyKey -> orderId

  /**
   * Create an order with QRIS and deep link e-wallet options
   */
  public async createOrder(params: CreateOrderParams): Promise<Order> {
    // 1. Idempotency Check
    if (this.idempotencyMap.has(params.idempotencyKey)) {
      const existingId = this.idempotencyMap.get(params.idempotencyKey)!;
      const existing = this.orders.get(existingId);
      if (existing) return existing;
    }

    const orderId = `SF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amount = params.packageId === '1_session' ? 15000 : 35000;
    const now = Date.now();

    // Check if real Midtrans keys are available
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isMidtransConfigured = serverKey && !serverKey.includes('YOUR_SERVER_KEY');

    let qrCodeUrl: string | undefined;
    let qrString: string | undefined;
    let deeplinkUrl: string | undefined;
    const gateway: 'midtrans' | 'mock' = isMidtransConfigured ? 'midtrans' : 'mock';

    if (isMidtransConfigured) {
      try {
        const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
        const midtransEndpoint = isProduction
          ? 'https://api.midtrans.com/v2/charge'
          : 'https://api.sandbox.midtrans.com/v2/charge';

        const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
        const midtransRes = await fetch(midtransEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            payment_type: params.method === 'gopay' ? 'gopay' : 'qris',
            transaction_details: {
              order_id: orderId,
              gross_amount: amount,
            },
            gopay: {
              enable_callback: true,
              callback_url: params.clientReturnUrl,
            },
          }),
        });

        if (midtransRes.ok) {
          const midtransData = await midtransRes.json();
          if (midtransData.actions) {
            const qrAction = midtransData.actions.find((a: any) => a.name === 'generate-qr-code');
            const dlAction = midtransData.actions.find((a: any) => a.name === 'deeplink-redirect');
            if (qrAction) qrCodeUrl = qrAction.url;
            if (dlAction) deeplinkUrl = dlAction.url;
          }
          if (midtransData.qr_string) qrString = midtransData.qr_string;
        }
      } catch (err) {
        console.warn('Midtrans API call failed, falling back to mock provider:', err);
      }
    }

    // Mock Simulator Fallback for instant development testing
    if (!qrCodeUrl && !qrString) {
      // Generate synthetic standard Indonesian QRIS payload
      qrString = `00020101021226610016ID.CO.SATUFRAME0118936000000000000000520458125303360540${amount}5802ID5910SATU FRAME6007JAKARTA6304ABCD`;
      qrCodeUrl = await QRCode.toDataURL(qrString, { width: 300, margin: 2 });
      deeplinkUrl = `gopay://pay?order_id=${orderId}&amount=${amount}`;
    }

    const order: Order = {
      id: orderId,
      sessionId: params.sessionId,
      packageId: params.packageId,
      amountIdr: amount,
      status: 'PENDING',
      method: params.method || 'qris',
      gateway,
      idempotencyKey: params.idempotencyKey,
      qrCodeUrl,
      qrString,
      deeplinkUrl,
      expiresAt: now + 15 * 60 * 1000, // 15 mins expiry
      createdAt: now,
    };

    this.orders.set(orderId, order);
    this.idempotencyMap.set(params.idempotencyKey, orderId);

    // P1-07: Lock raw photo files from auto-deletion while order is pending or in settlement window
    try {
      const { sessionStateManager } = require('@/server/state-machine');
      sessionStateManager.lockPhotosTtl(params.sessionId, now + 48 * 60 * 60 * 1000);
    } catch {}

    return order;
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Mark order as paid (via webhook or simulation)
   */
  public markOrderPaid(orderId: string): Order | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    if (order.status === 'PAID') return order; // Idempotent return

    order.status = 'PAID';
    order.paidAt = Date.now();
    order.fulfilledAt = Date.now();

    return order;
  }

  /**
   * AMB-05: Abstract webhook signature verification supporting Midtrans (SHA-512) and Xendit (HMAC-SHA256)
   */
  public verifyWebhookSignature(
    params: {
      orderId?: string;
      statusCode?: string;
      grossAmount?: string;
      rawBody?: string;
    },
    signature: string,
    gateway: 'midtrans' | 'xendit' = 'midtrans',
    serverKey = process.env.MIDTRANS_SERVER_KEY || 'test_server_key'
  ): boolean {
    if (!signature) return false;
    const crypto = require('crypto');

    if (gateway === 'midtrans') {
      // Midtrans spec: SHA512(order_id + status_code + gross_amount + ServerKey)
      const input = `${params.orderId || ''}${params.statusCode || ''}${params.grossAmount || ''}${serverKey}`;
      const hash = crypto.createHash('sha512').update(input).digest('hex');
      return hash.toLowerCase() === signature.toLowerCase();
    } else if (gateway === 'xendit') {
      // Xendit spec: HMAC-SHA256(rawBody, verificationToken)
      const hmac = crypto.createHmac('sha256', serverKey).update(params.rawBody || '').digest('hex');
      return hmac.toLowerCase() === signature.toLowerCase();
    }

    return false;
  }
}

const globalForPayment = globalThis as unknown as {
  paymentService: PaymentService | undefined;
};

export const paymentService =
  globalForPayment.paymentService ?? new PaymentService();

globalForPayment.paymentService = paymentService;
