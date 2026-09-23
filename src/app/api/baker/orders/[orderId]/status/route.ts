import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'BAKER') {
      return NextResponse.json({ error: 'Forbidden: Baker access required' }, { status: 403 });
    }

    const { orderId } = await params;
    const { status } = await request.json();

    const allowedStatuses = ['PENDING', 'CONFIRMED', 'BAKING', 'READY', 'COLLECTED', 'CANCELLED'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed statuses: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    // Log to audit table
    await db.insert(schema.auditLogs).values({
      entityType: 'order',
      entityId: orderId,
      action: `STATUS_CHANGED_TO_${status}`,
      actorId: session.userId,
      changes: JSON.stringify({
        previousStatus: existing.status,
        newStatus: status,
      }),
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
