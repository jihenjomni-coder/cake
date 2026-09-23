import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'BAKER') {
      return NextResponse.json({ error: 'Forbidden: Baker access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');

    const db = getDatabase();

    let query = db.select().from(schema.orders);
    const conditions: any[] = [];

    if (dateParam) {
      conditions.push(eq(schema.orders.pickupDate, dateParam));
    }

    if (statusParam && statusParam !== 'ALL') {
      conditions.push(eq(schema.orders.status, statusParam as any));
    }

    const ordersList = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(schema.orders.pickupDate), desc(schema.orders.createdAt))
      : await query.orderBy(asc(schema.orders.pickupDate), desc(schema.orders.createdAt));

    const orderIds = ordersList.map((o: any) => o.id);
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

    const enrichedOrders = ordersList.map((order: any) => {
      const items = allItems
        .filter((i: any) => i.orderId === order.id)
        .map((item: any) => ({
          ...item,
          customisation: allCustoms.find((c: any) => c.orderItemId === item.id) || null,
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
    console.error('Error fetching baker orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
