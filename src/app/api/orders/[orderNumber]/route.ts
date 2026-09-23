import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const session = await getSession();
    const db = getDatabase();

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Access control: If order belongs to a registered user and visitor is logged in as someone else, deny
    if (order.userId && session && session.role !== 'BAKER' && session.userId !== order.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You cannot access another customer’s order' },
        { status: 403 }
      );
    }

    // Items
    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    const itemIds = items.map((i: any) => i.id);
    let customisations: any[] = [];
    if (itemIds.length > 0) {
      customisations = await db.select().from(schema.orderCustomisations);
      customisations = customisations.filter((c: any) => itemIds.includes(c.orderItemId));
    }

    // Pickup slot
    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.id, order.pickupSlotId));

    // Payments
    const payments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, order.id));

    // Generate Pickup QR Code
    const qrPayload = JSON.stringify({
      orderNumber: order.orderNumber,
      customer: order.customerName,
      pickupDate: order.pickupDate,
      pickupWindow: slot ? `${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)}` : '',
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cakecart.vercel.app'}/orders/${order.orderNumber}`,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#2C1A14', // Warm cocoa
        light: '#FFFFFF',
      },
    });

    const enrichedItems = items.map((item: any) => ({
      ...item,
      customisation: customisations.find((c: any) => c.orderItemId === item.id) || null,
    }));

    return NextResponse.json({
      order: {
        ...order,
        items: enrichedItems,
        pickupSlot: slot
          ? {
              startTime: slot.startTime.substring(0, 5),
              endTime: slot.endTime.substring(0, 5),
            }
          : null,
        payments,
        qrCodeDataUrl,
      },
    });
  } catch (error: any) {
    console.error('Error fetching order by number:', error);
    return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
  }
}
