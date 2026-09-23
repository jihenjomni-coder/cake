import { NextRequest, NextResponse } from 'next/server';
import { confirmOrderPayment } from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || request.headers.get('x-webhook-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Validate signature if webhookSecret is configured
    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      const data = event.data?.object || event;
      const orderId = data.metadata?.orderId || data.orderId;
      const idempotencyKey = event.id || `webhook_${data.id}`;
      const amountCents = data.amount || data.amount_cents;
      const transactionId = data.id || `txn_wh_${Date.now()}`;

      if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId in webhook metadata' }, { status: 400 });
      }

      const result = await confirmOrderPayment(orderId, idempotencyKey, {
        transactionId,
        amountCents: amountCents || 0,
        provider: 'test_stripe',
        rawResponse: rawBody,
      });

      return NextResponse.json({
        received: true,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook failed' }, { status: 500 });
  }
}
