import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { cancelCustomerOrder, ValidationError } from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const session = await getSession();
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason;

    const db = getDatabase();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Access check
    if (order.userId && session && session.role !== 'BAKER' && session.userId !== order.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You cannot cancel another customer’s order.' },
        { status: 403 }
      );
    }

    const cancelledOrder = await cancelCustomerOrder(
      order.id,
      session?.userId || null,
      reason
    );

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully and reservation released.',
      order: cancelledOrder,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
