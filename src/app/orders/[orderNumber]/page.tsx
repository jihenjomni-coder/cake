import React from 'react';
import { notFound } from 'next/navigation';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import OrderConfirmationView from '@/components/OrderConfirmationView';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

async function getOrderDetails(orderNumber: string) {
  try {
    const db = getDatabase();

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, orderNumber));

    if (!order) return null;

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
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#2A1810',
        light: '#FFFFFF',
      },
    });

    const enrichedItems = items.map((item: any) => ({
      ...item,
      customisation: customisations.find((c: any) => c.orderItemId === item.id) || null,
    }));

    return {
      ...order,
      items: enrichedItems,
      pickupSlot: slot
        ? {
            startTime: slot.startTime.substring(0, 5),
            endTime: slot.endTime.substring(0, 5),
          }
        : undefined,
      payments,
      qrCodeDataUrl,
    };
  } catch (err) {
    console.error('Error fetching order:', err);
    return null;
  }
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderDetails(orderNumber);

  if (!order) {
    notFound();
  }

  return <OrderConfirmationView order={order} />;
}
