import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { confirmOrderPayment } from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, idempotencyKey, paymentMethod } = body;

    if (!orderId || !idempotencyKey) {
      return NextResponse.json(
        { error: 'Order ID and Idempotency Key are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Simulate card validation in test mode
    if (paymentMethod?.simulateFailure) {
      return NextResponse.json(
        { error: 'Payment declined: Test card declined (simulated error).' },
        { status: 402 }
      );
    }

    // Generate unique test transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Perform atomic confirmation
    const result = await confirmOrderPayment(order.id, idempotencyKey, {
      transactionId,
      amountCents: order.totalCents,
      provider: 'test_stripe',
      rawResponse: JSON.stringify({
        status: 'succeeded',
        cardBrand: paymentMethod?.brand || 'Visa',
        last4: paymentMethod?.last4 || '4242',
        testMode: true,
      }),
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      alreadyProcessed: result.alreadyProcessed,
      transactionId,
      message: 'Payment confirmed successfully.',
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment processing failed.' },
      { status: 400 }
    );
  }
}
