import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import {
  createPendingOrderWithHold,
  CapacityError,
  ValidationError,
} from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      pickupSlotId,
      items,
    } = body;

    if (!customerName || !customerEmail || !customerPhone || !pickupDate || !pickupSlotId) {
      return NextResponse.json(
        { error: 'All customer contact and pickup details are required.' },
        { status: 400 }
      );
    }

    const result = await createPendingOrderWithHold({
      userId: session?.userId || null,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      pickupDate,
      pickupSlotId,
      items,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      holdExpiresAt: result.holdExpiresAt,
      message: 'Temporary capacity hold created. Please complete payment within 10 minutes.',
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CapacityError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error creating order hold:', error);
    return NextResponse.json({ error: error.message || 'Failed to reserve order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const customerOrders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, session.userId))
      .orderBy(desc(schema.orders.createdAt));

    const orderIds = customerOrders.map((o: any) => o.id);
    let allItems: any[] = [];
    let allCustoms: any[] = [];
    let allSlots: any[] = [];

    if (orderIds.length > 0) {
      allItems = await db.select().from(schema.orderItems);
      allItems = allItems.filter((i: any) => orderIds.includes(i.orderId));

      const itemIds = allItems.map((i: any) => i.id);
      if (itemIds.length > 0) {
        allCustoms = await db.select().from(schema.orderCustomisations);
        allCustoms = allCustoms.filter((c: any) => itemIds.includes(c.orderItemId));
      }

      allSlots = await db.select().from(schema.pickupSlots);
    }

    const enrichedOrders = customerOrders.map((order: any) => {
      const items = allItems
        .filter((i: any) => i.orderId === order.id)
        .map((item: any) => ({
          ...item,
          customisation: allCustoms.find((c: any) => c.orderItemId === item.id),
        }));

      const slot = allSlots.find((s: any) => s.id === order.pickupSlotId);

      return {
        ...order,
        items,
        pickupSlot: slot
          ? {
              startTime: slot.startTime.substring(0, 5),
              endTime: slot.endTime.substring(0, 5),
            }
          : null,
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
