import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export interface OrderItemInput {
  productId: string;
  sizeOptionId: string;
  flavourOptionId: string;
  customMessage?: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string; // YYYY-MM-DD
  pickupSlotId: string;
  items: OrderItemInput[];
}

export const MESSAGE_FEE_CENTS = 300; // $3.00
export const MINIMUM_LEAD_HOURS = 48; // 48 hours minimum lead time
export const CANCELLATION_CUTOFF_HOURS = 24; // 24 hours cut-off

export class CapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapacityError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateLeadTime(pickupDateStr: string): boolean {
  const [year, month, day] = pickupDateStr.split('-').map(Number);
  // Bakery pickup start at 00:00:00 UTC of chosen pickup day
  const pickupTime = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getTime();
  const now = Date.now();
  const leadMs = pickupTime - now;
  const leadHours = leadMs / (1000 * 60 * 60);
  return leadHours >= MINIMUM_LEAD_HOURS;
}

export async function createPendingOrderWithHold(input: CreateOrderInput) {
  // 1. Minimum Lead Time Check
  if (!validateLeadTime(input.pickupDate)) {
    throw new ValidationError(
      `Orders require at least ${MINIMUM_LEAD_HOURS} hours advance notice.`
    );
  }

  // 2. Validate Items & Message Limits (40 chars max)
  if (!input.items || input.items.length === 0) {
    throw new ValidationError('Cart cannot be empty.');
  }

  let totalCakes = 0;
  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new ValidationError('Item quantity must be greater than 0.');
    }
    if (item.customMessage && item.customMessage.length > 40) {
      throw new ValidationError(
        `Custom message "${item.customMessage}" exceeds the 40 character limit.`
      );
    }
    totalCakes += item.quantity;
  }

  const db = getDatabase();

  // Execute in ACID transaction
  return await db.transaction(async (tx: any) => {
    // 3. Lock daily_capacity row FOR UPDATE
    const capacityRows = await tx.execute(
      sql`SELECT id, bakery_date, max_cakes, reserved_cakes, is_closed 
          FROM daily_capacity 
          WHERE bakery_date = ${input.pickupDate} 
          FOR UPDATE`
    );

    const capacity = capacityRows.rows?.[0] || capacityRows[0];
    if (!capacity) {
      throw new CapacityError(`No capacity scheduled for date ${input.pickupDate}.`);
    }

    if (capacity.is_closed) {
      throw new CapacityError(`The bakery is closed on ${input.pickupDate}.`);
    }

    const currentReserved = Number(capacity.reserved_cakes);
    const maxCakes = Number(capacity.max_cakes);

    if (currentReserved + totalCakes > maxCakes) {
      throw new CapacityError(
        `Insufficient capacity for ${input.pickupDate}. Available: ${maxCakes - currentReserved}, Requested: ${totalCakes}.`
      );
    }

    // 4. Lock pickup_slots row FOR UPDATE
    const slotRows = await tx.execute(
      sql`SELECT id, bakery_date, start_time, end_time, max_orders, booked_orders 
          FROM pickup_slots 
          WHERE id = ${input.pickupSlotId} 
          FOR UPDATE`
    );

    const slot = slotRows.rows?.[0] || slotRows[0];
    if (!slot) {
      throw new CapacityError('Selected pickup slot not found.');
    }

    // Handle date format differences (e.g. Date object vs string)
    const slotDateStr = slot.bakery_date instanceof Date 
      ? slot.bakery_date.toISOString().split('T')[0] 
      : String(slot.bakery_date).split('T')[0];

    if (slotDateStr !== input.pickupDate) {
      throw new ValidationError('Pickup slot does not match selected date.');
    }

    const currentBooked = Number(slot.booked_orders);
    const maxOrders = Number(slot.max_orders);

    if (currentBooked + 1 > maxOrders) {
      throw new CapacityError('Selected pickup slot is fully booked. Please choose another time.');
    }

    // 5. Calculate prices strictly on server
    let orderSubtotalCents = 0;
    let orderMessageFeeCents = 0;
    const resolvedItems: Array<{
      productId: string;
      cakeName: string;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
      sizeName: string;
      flavourName: string;
      customMessage?: string;
      messageFeeCents: number;
    }> = [];

    for (const item of input.items) {
      const prodRes = await tx.execute(
        sql`SELECT id, name, base_price_cents, is_active FROM products WHERE id = ${item.productId}`
      );
      const product = prodRes.rows?.[0] || prodRes[0];
      if (!product || !product.is_active) {
        throw new ValidationError(`Product ${item.productId} is not available.`);
      }

      // Size option
      const sizeRes = await tx.execute(
        sql`SELECT id, name, price_modifier_cents FROM product_options WHERE id = ${item.sizeOptionId} AND type = 'SIZE'`
      );
      const sizeOpt = sizeRes.rows?.[0] || sizeRes[0];
      if (!sizeOpt) {
        throw new ValidationError('Selected cake size is invalid.');
      }

      // Flavour option
      const flavRes = await tx.execute(
        sql`SELECT id, name, price_modifier_cents FROM product_options WHERE id = ${item.flavourOptionId} AND type = 'FLAVOUR'`
      );
      const flavOpt = flavRes.rows?.[0] || flavRes[0];
      if (!flavOpt) {
        throw new ValidationError('Selected cake flavour is invalid.');
      }

      const unitPriceCents =
        Number(product.base_price_cents) +
        Number(sizeOpt.price_modifier_cents) +
        Number(flavOpt.price_modifier_cents);

      const hasCustomMessage = Boolean(item.customMessage && item.customMessage.trim().length > 0);
      const itemMessageFee = hasCustomMessage ? MESSAGE_FEE_CENTS : 0;
      const itemTotalCents = unitPriceCents * item.quantity + itemMessageFee;

      orderSubtotalCents += unitPriceCents * item.quantity;
      orderMessageFeeCents += itemMessageFee;

      resolvedItems.push({
        productId: product.id,
        cakeName: product.name,
        quantity: item.quantity,
        unitPriceCents,
        totalPriceCents: itemTotalCents,
        sizeName: sizeOpt.name,
        flavourName: flavOpt.name,
        customMessage: item.customMessage?.trim() || undefined,
        messageFeeCents: itemMessageFee,
      });
    }

    const orderTotalCents = orderSubtotalCents + orderMessageFeeCents;

    // 6. Increment capacity & slot usage as 10-minute hold
    await tx.execute(
      sql`UPDATE daily_capacity 
          SET reserved_cakes = reserved_cakes + ${totalCakes}, updated_at = NOW() 
          WHERE id = ${capacity.id}`
    );

    await tx.execute(
      sql`UPDATE pickup_slots 
          SET booked_orders = booked_orders + 1 
          WHERE id = ${slot.id}`
    );

    // 7. Create Pending Order
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `CK-${randomSuffix}`;
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const [newOrder] = await tx
      .insert(schema.orders)
      .values({
        orderNumber,
        userId: input.userId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        pickupDate: input.pickupDate,
        pickupSlotId: input.pickupSlotId,
        status: 'PENDING',
        subtotalCents: orderSubtotalCents,
        messageFeeCents: orderMessageFeeCents,
        totalCents: orderTotalCents,
        holdExpiresAt,
      })
      .returning();

    // 8. Insert Order Items & Customisations
    for (const resItem of resolvedItems) {
      const [orderItem] = await tx
        .insert(schema.orderItems)
        .values({
          orderId: newOrder.id,
          productId: resItem.productId,
          cakeName: resItem.cakeName,
          quantity: resItem.quantity,
          unitPriceCents: resItem.unitPriceCents,
          totalPriceCents: resItem.totalPriceCents,
        })
        .returning();

      await tx.insert(schema.orderCustomisations).values({
        orderItemId: orderItem.id,
        sizeName: resItem.sizeName,
        flavourName: resItem.flavourName,
        customMessage: resItem.customMessage || null,
        messageFeeCents: resItem.messageFeeCents,
      });
    }

    // 9. Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: 'order',
      entityId: newOrder.id,
      action: 'HOLD_CREATED',
      actorId: input.userId || 'GUEST',
      changes: JSON.stringify({
        orderNumber,
        totalCakes,
        totalCents: orderTotalCents,
        holdExpiresAt: holdExpiresAt.toISOString(),
      }),
    });

    return {
      order: newOrder,
      items: resolvedItems,
      holdExpiresAt,
    };
  });
}

/**
 * Idempotent Payment Confirmation
 */
export async function confirmOrderPayment(
  orderId: string,
  idempotencyKey: string,
  paymentDetails: {
    transactionId: string;
    amountCents: number;
    provider?: string;
    rawResponse?: string;
  }
) {
  const db = getDatabase();

  return await db.transaction(async (tx: any) => {
    // 1. Check if payment with idempotency key already exists
    const existingPaymentRes = await tx.execute(
      sql`SELECT id, order_id, status FROM payments WHERE idempotency_key = ${idempotencyKey}`
    );
    const existingPayment = existingPaymentRes.rows?.[0] || existingPaymentRes[0];

    if (existingPayment) {
      // Idempotent retry: Return order
      const [existingOrder] = await tx
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, existingPayment.order_id));
      return { order: existingOrder, alreadyProcessed: true };
    }

    // 2. Fetch order with row lock
    const orderRes = await tx.execute(
      sql`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE`
    );
    const order = orderRes.rows?.[0] || orderRes[0];

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'PENDING') {
      if (order.status === 'CONFIRMED') {
        return { order, alreadyProcessed: true };
      }
      throw new Error(`Cannot confirm payment for order with status ${order.status}.`);
    }

    // Check if hold has expired
    if (order.hold_expires_at && new Date(order.hold_expires_at).getTime() < Date.now()) {
      throw new Error('Reservation hold has expired. Please select your pickup slot again.');
    }

    // 3. Record Payment
    await tx.insert(schema.payments).values({
      orderId: order.id,
      provider: paymentDetails.provider || 'test_stripe',
      transactionId: paymentDetails.transactionId,
      idempotencyKey,
      amountCents: paymentDetails.amountCents,
      currency: 'usd',
      status: 'SUCCEEDED',
      rawResponse: paymentDetails.rawResponse || JSON.stringify(paymentDetails),
    });

    // 4. Update Order Status to CONFIRMED and clear hold
    const [confirmedOrder] = await tx
      .update(schema.orders)
      .set({
        status: 'CONFIRMED',
        holdExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, order.id))
      .returning();

    // 5. Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: 'order',
      entityId: order.id,
      action: 'PAYMENT_CONFIRMED',
      actorId: order.user_id || 'GUEST',
      changes: JSON.stringify({
        transactionId: paymentDetails.transactionId,
        idempotencyKey,
        amountCents: paymentDetails.amountCents,
      }),
    });

    return { order: confirmedOrder, alreadyProcessed: false };
  });
}

/**
 * Release Expired Holds
 * Idempotently marks expired PENDING orders as EXPIRED and decrements capacity & slot usage
 */
export async function releaseExpiredHolds() {
  const db = getDatabase();

  return await db.transaction(async (tx: any) => {
    // 1. Lock expired pending orders
    const expiredRes = await tx.execute(
      sql`SELECT id, order_number, pickup_date, pickup_slot_id 
          FROM orders 
          WHERE status = 'PENDING' AND hold_expires_at < NOW() 
          FOR UPDATE`
    );

    const expiredOrders = expiredRes.rows || expiredRes;
    const releasedCount = expiredOrders.length;

    for (const exp of expiredOrders) {
      // 2. Sum cake count for this order
      const itemsRes = await tx.execute(
        sql`SELECT COALESCE(SUM(quantity), 0) AS cake_count FROM order_items WHERE order_id = ${exp.id}`
      );
      const itemsRow = itemsRes.rows?.[0] || itemsRes[0];
      const cakeCount = Math.max(1, Number(itemsRow?.cake_count || 1));

      const pickupDateStr = exp.pickup_date instanceof Date
        ? exp.pickup_date.toISOString().split('T')[0]
        : String(exp.pickup_date).split('T')[0];

      // Decrement reserved_cakes in daily_capacity (ensuring non-negative)
      await tx.execute(
        sql`UPDATE daily_capacity 
            SET reserved_cakes = GREATEST(0, reserved_cakes - ${cakeCount}), updated_at = NOW()
            WHERE bakery_date = ${pickupDateStr}`
      );

      // Decrement booked_orders in pickup_slots (ensuring non-negative)
      await tx.execute(
        sql`UPDATE pickup_slots 
            SET booked_orders = GREATEST(0, booked_orders - 1)
            WHERE id = ${exp.pickup_slot_id}`
      );

      // Transition order status to EXPIRED
      await tx
        .update(schema.orders)
        .set({
          status: 'EXPIRED',
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, exp.id));

      // Audit Log
      await tx.insert(schema.auditLogs).values({
        entityType: 'order',
        entityId: exp.id,
        action: 'HOLD_EXPIRED',
        actorId: 'CRON_SYSTEM',
        changes: JSON.stringify({
          orderNumber: exp.order_number,
          cakesReleased: cakeCount,
        }),
      });
    }

    return { releasedCount, expiredOrders };
  });
}

/**
 * Customer Order Cancellation (Cut-off: 24 hours before pickup)
 */
export async function cancelCustomerOrder(
  orderId: string,
  userId?: string | null,
  reason?: string
) {
  const db = getDatabase();

  return await db.transaction(async (tx: any) => {
    // 1. Lock order row
    const orderRes = await tx.execute(
      sql`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE`
    );

    const order = orderRes.rows?.[0] || orderRes[0];
    if (!order) {
      throw new ValidationError('Order not found.');
    }

    // Customer isolation check
    if (userId && order.user_id && order.user_id !== userId) {
      throw new ValidationError('Unauthorized: You cannot cancel another customer’s order.');
    }

    // Must be in cancellable state
    if (order.status !== 'CONFIRMED' && order.status !== 'PENDING') {
      throw new ValidationError(
        `Orders in '${order.status}' status cannot be cancelled.`
      );
    }

    // 24-hour Cut-off Rule:
    const pickupDateStr = order.pickup_date instanceof Date
      ? order.pickup_date.toISOString().split('T')[0]
      : String(order.pickup_date).split('T')[0];

    const [year, month, day] = pickupDateStr.split('-').map(Number);
    const pickupTimeMs = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getTime();
    const nowMs = Date.now();
    const hoursRemaining = (pickupTimeMs - nowMs) / (1000 * 60 * 60);

    if (hoursRemaining < CANCELLATION_CUTOFF_HOURS) {
      throw new ValidationError(
        `Orders cannot be cancelled within ${CANCELLATION_CUTOFF_HOURS} hours of pickup. Time remaining: ${hoursRemaining.toFixed(1)} hours.`
      );
    }

    // Sum cakes
    const itemsRes = await tx.execute(
      sql`SELECT COALESCE(SUM(quantity), 0) AS cake_count FROM order_items WHERE order_id = ${order.id}`
    );
    const itemsRow = itemsRes.rows?.[0] || itemsRes[0];
    const cakeCount = Math.max(1, Number(itemsRow?.cake_count || 1));

    // Release capacity & slot
    await tx.execute(
      sql`UPDATE daily_capacity 
          SET reserved_cakes = GREATEST(0, reserved_cakes - ${cakeCount}), updated_at = NOW()
          WHERE bakery_date = ${pickupDateStr}`
    );

    await tx.execute(
      sql`UPDATE pickup_slots 
          SET booked_orders = GREATEST(0, booked_orders - 1)
          WHERE id = ${order.pickup_slot_id}`
    );

    // Update order status to CANCELLED
    const [cancelledOrder] = await tx
      .update(schema.orders)
      .set({
        status: 'CANCELLED',
        cancellationReason: reason || 'Customer requested cancellation',
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, order.id))
      .returning();

    // Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: 'order',
      entityId: order.id,
      action: 'ORDER_CANCELLED',
      actorId: userId || 'CUSTOMER',
      changes: JSON.stringify({
        reason: reason || 'Customer requested cancellation',
        hoursBeforePickup: hoursRemaining,
        cakesReleased: cakeCount,
      }),
    });

    return cancelledOrder;
  });
}
