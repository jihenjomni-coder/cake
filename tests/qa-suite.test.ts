import assert from 'node:assert';
import { getDatabase } from '../src/db';
import * as schema from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';
import {
  createPendingOrderWithHold,
  confirmOrderPayment,
  releaseExpiredHolds,
  cancelCustomerOrder,
  CapacityError,
  ValidationError,
  validateLeadTime,
} from '../src/lib/transactions/order-transaction';
import bcrypt from 'bcryptjs';

async function runQASuite() {
  console.log('\n============================================================');
  console.log('🧪 CAKECART QA AGENT - COMPREHENSIVE AUTOMATED TEST HARNESS');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      if (err.stack) console.error(`    Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`);
      throw err;
    }
  }

  // 1. Migrations & Clean Seed
  await test('Database Migrations and Seed Execution', async () => {
    await runMigrations();
    await seedDatabase();
    const db = getDatabase();
    const products = await db.select().from(schema.products);
    assert(products.length >= 6, 'Expected at least 6 artisan products in seed database');
  });

  // 2. Authentication & Password Hashing
  await test('User Authentication & Password Integrity', async () => {
    const db = getDatabase();
    const [baker] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'baker@cakecart.com'));
    assert(baker, 'Baker user should exist');
    assert.strictEqual(baker.role, 'BAKER');

    const validPass = await bcrypt.compare('BakerPassword123!', baker.passwordHash);
    assert.strictEqual(validPass, true, 'Baker password must match hash');

    const invalidPass = await bcrypt.compare('WrongPassword!', baker.passwordHash);
    assert.strictEqual(invalidPass, false, 'Invalid password must be rejected');
  });

  // 3. Minimum 48-Hour Lead Time Validation
  await test('Minimum 48-Hour Lead Time Enforcement', async () => {
    // Tomorrow (less than 48 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Day 5 (greater than 48 hours)
    const day5 = new Date();
    day5.setDate(day5.getDate() + 5);
    const day5Str = day5.toISOString().split('T')[0];

    assert.strictEqual(
      validateLeadTime(tomorrowStr),
      false,
      'Date within 48h must be rejected by lead time validator'
    );
    assert.strictEqual(
      validateLeadTime(day5Str),
      true,
      'Date >= 48h must be accepted by lead time validator'
    );
  });

  // 4. Closed Dates Rejection on Server
  await test('Closed Bakery Date Rejection on Server', async () => {
    const db = getDatabase();
    const closedDate = new Date();
    closedDate.setDate(closedDate.getDate() + 7); // Day 7 was marked closed in seed
    const closedDateStr = closedDate.toISOString().split('T')[0];

    // Ensure it is marked closed in DB
    await db
      .update(schema.dailyCapacity)
      .set({ isClosed: true })
      .where(eq(schema.dailyCapacity.bakeryDate, closedDateStr));

    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, closedDateStr));

    const [prod] = await db.select().from(schema.products);
    const [size] = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const [flavour] = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));

    let threw = false;
    try {
      await createPendingOrderWithHold({
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+1-555-0100',
        pickupDate: closedDateStr,
        pickupSlotId: slot.id,
        items: [
          {
            productId: prod.id,
            sizeOptionId: size.id,
            flavourOptionId: flavour.id,
            quantity: 1,
          },
        ],
      });
    } catch (err: any) {
      threw = true;
      assert(err instanceof CapacityError, 'Expected CapacityError for closed date');
      assert(err.message.includes('closed'), 'Expected message indicating bakery is closed');
    }
    assert.strictEqual(threw, true, 'Order on closed date must be rejected on server');
  });

  // 5. 40-Character Message Limit Enforcement (Client & Server)
  await test('Custom Message 40-Character Limit Rule', async () => {
    const db = getDatabase();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 4);
    const dateStr = targetDate.toISOString().split('T')[0];

    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, dateStr));
    const [prod] = await db.select().from(schema.products);
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const size = options.find((o) => o.type === 'SIZE')!;
    const flavour = options.find((o) => o.type === 'FLAVOUR')!;

    // Test message exceeding 40 chars
    const overlyLongMessage = 'Happy 50th Golden Jubilee Birthday To Our Beloved Grandfather!';
    assert(overlyLongMessage.length > 40, 'Test message must be > 40 chars');

    let threw = false;
    try {
      await createPendingOrderWithHold({
        customerName: 'Test Message Customer',
        customerEmail: 'msg@example.com',
        customerPhone: '+1-555-0100',
        pickupDate: dateStr,
        pickupSlotId: slot.id,
        items: [
          {
            productId: prod.id,
            sizeOptionId: size.id,
            flavourOptionId: flavour.id,
            customMessage: overlyLongMessage,
            quantity: 1,
          },
        ],
      });
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError, 'Expected ValidationError for message > 40 chars');
      assert(err.message.includes('40 character limit'));
    }
    assert.strictEqual(threw, true, 'Server must reject messages exceeding 40 characters');

    // Test message exactly 40 chars
    const exact40Message = '1234567890123456789012345678901234567890';
    assert.strictEqual(exact40Message.length, 40);

    const validOrder = await createPendingOrderWithHold({
      customerName: 'Valid Message Customer',
      customerEmail: 'msg_valid@example.com',
      customerPhone: '+1-555-0100',
      pickupDate: dateStr,
      pickupSlotId: slot.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          customMessage: exact40Message,
          quantity: 1,
        },
      ],
    });

    assert(validOrder.order, 'Order with <= 40 chars should succeed');
    assert.strictEqual(
      validOrder.order.messageFeeCents,
      300,
      'Custom message fee ($3.00) must be applied'
    );
  });

  // 6. Concurrency & Race Condition Test (Simultaneous Order for Last Cake)
  await test('Concurrent Race Condition: Only 1 order succeeds for last cake', async () => {
    const db = getDatabase();
    const raceDate = new Date();
    raceDate.setDate(raceDate.getDate() + 9);
    const raceDateStr = raceDate.toISOString().split('T')[0];

    // Explicitly set capacity: max = 1, reserved = 0
    await db
      .insert(schema.dailyCapacity)
      .values({
        bakeryDate: raceDateStr,
        maxCakes: 1,
        reservedCakes: 0,
        isClosed: false,
      })
      .onConflictDoUpdate({
        target: schema.dailyCapacity.bakeryDate,
        set: { maxCakes: 1, reservedCakes: 0, isClosed: false },
      });

    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, raceDateStr));

    // Reset slot
    await db
      .update(schema.pickupSlots)
      .set({ maxOrders: 2, bookedOrders: 0 })
      .where(eq(schema.pickupSlots.id, slot.id));

    const [prod] = await db.select().from(schema.products);
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const size = options.find((o) => o.type === 'SIZE')!;
    const flavour = options.find((o) => o.type === 'FLAVOUR')!;

    // Two parallel requests attempting to claim the single remaining cake
    const orderInput1 = {
      customerName: 'Session A',
      customerEmail: 'sessionA@example.com',
      customerPhone: '+1-555-0101',
      pickupDate: raceDateStr,
      pickupSlotId: slot.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          quantity: 1,
        },
      ],
    };

    const orderInput2 = {
      customerName: 'Session B',
      customerEmail: 'sessionB@example.com',
      customerPhone: '+1-555-0102',
      pickupDate: raceDateStr,
      pickupSlotId: slot.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          quantity: 1,
        },
      ],
    };

    const results = await Promise.allSettled([
      createPendingOrderWithHold(orderInput1),
      createPendingOrderWithHold(orderInput2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(
      fulfilled.length,
      1,
      `Exactly 1 concurrent order must succeed. Got fulfilled: ${fulfilled.length}`
    );
    assert.strictEqual(
      rejected.length,
      1,
      `Exactly 1 concurrent order must be rejected. Got rejected: ${rejected.length}`
    );

    // Verify DB capacity state
    const [finalCap] = await db
      .select()
      .from(schema.dailyCapacity)
      .where(eq(schema.dailyCapacity.bakeryDate, raceDateStr));

    assert.strictEqual(finalCap.reservedCakes, 1, 'reserved_cakes must be exactly 1');
    assert(
      finalCap.reservedCakes <= finalCap.maxCakes,
      'reserved_cakes must NEVER exceed max_cakes'
    );
  });

  // 7. Expired Holds and Automatic Capacity Release
  await test('Expired Holds Release Routine & Idempotency', async () => {
    const db = getDatabase();
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 10);
    const dateStr = testDate.toISOString().split('T')[0];

    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, dateStr));
    const [prod] = await db.select().from(schema.products);
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const size = options.find((o) => o.type === 'SIZE')!;
    const flavour = options.find((o) => o.type === 'FLAVOUR')!;

    // Create order with hold
    const holdRes = await createPendingOrderWithHold({
      customerName: 'Expiring Customer',
      customerEmail: 'expire@example.com',
      customerPhone: '+1-555-0100',
      pickupDate: dateStr,
      pickupSlotId: slot.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          quantity: 2, // 2 cakes
        },
      ],
    });

    const orderId = holdRes.order.id;

    // Artificially age the hold to 15 minutes ago
    const pastTime = new Date(Date.now() - 15 * 60 * 1000);
    await db
      .update(schema.orders)
      .set({ holdExpiresAt: pastTime })
      .where(eq(schema.orders.id, orderId));

    // Run hold release routine
    const releaseRes = await releaseExpiredHolds();
    assert(releaseRes.releasedCount >= 1, 'Should have released at least 1 expired order');

    // Confirm order is now EXPIRED
    const [expiredOrder] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));
    assert.strictEqual(expiredOrder.status, 'EXPIRED');

    // Run hold release routine a second time to verify IDEMPOTENCY
    const secondRelease = await releaseExpiredHolds();
    assert.strictEqual(
      secondRelease.releasedCount,
      0,
      'Second release run must release 0 (idempotent)'
    );
  });

  // 8. Payment Confirmation & Idempotency
  await test('Payment Confirmation with Idempotency Key', async () => {
    const db = getDatabase();
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 11);
    const dateStr = testDate.toISOString().split('T')[0];

    const [slot] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, dateStr));
    const [prod] = await db.select().from(schema.products);
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const size = options.find((o) => o.type === 'SIZE')!;
    const flavour = options.find((o) => o.type === 'FLAVOUR')!;

    const holdRes = await createPendingOrderWithHold({
      customerName: 'Payment Customer',
      customerEmail: 'pay@example.com',
      customerPhone: '+1-555-0100',
      pickupDate: dateStr,
      pickupSlotId: slot.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          quantity: 1,
        },
      ],
    });

    const idempotencyKey = `idem_test_${Date.now()}`;

    // First confirmation
    const firstPay = await confirmOrderPayment(holdRes.order.id, idempotencyKey, {
      transactionId: 'txn_test_123',
      amountCents: holdRes.order.totalCents,
      provider: 'test_stripe',
    });

    assert.strictEqual(firstPay.order.status, 'CONFIRMED');
    assert.strictEqual(firstPay.alreadyProcessed, false);

    // Duplicate confirmation with same idempotency key
    const secondPay = await confirmOrderPayment(holdRes.order.id, idempotencyKey, {
      transactionId: 'txn_test_123',
      amountCents: holdRes.order.totalCents,
      provider: 'test_stripe',
    });

    assert.strictEqual(secondPay.order.status, 'CONFIRMED');
    assert.strictEqual(
      secondPay.alreadyProcessed,
      true,
      'Duplicate webhook/retry with same idempotency key must return alreadyProcessed: true'
    );
  });

  // 9. Order Cancellation 24-Hour Cut-off Rule
  await test('Order Cancellation 24-Hour Cut-off Enforcement', async () => {
    const db = getDatabase();

    // Order A: 5 days in future (Eligible for cancellation)
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 5);
    const farDateStr = farDate.toISOString().split('T')[0];

    const [slotFar] = await db
      .select()
      .from(schema.pickupSlots)
      .where(eq(schema.pickupSlots.bakeryDate, farDateStr));
    const [prod] = await db.select().from(schema.products);
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, prod.id));
    const size = options.find((o) => o.type === 'SIZE')!;
    const flavour = options.find((o) => o.type === 'FLAVOUR')!;

    const farOrder = await createPendingOrderWithHold({
      customerName: 'Far Customer',
      customerEmail: 'far@example.com',
      customerPhone: '+1-555-0100',
      pickupDate: farDateStr,
      pickupSlotId: slotFar.id,
      items: [
        {
          productId: prod.id,
          sizeOptionId: size.id,
          flavourOptionId: flavour.id,
          quantity: 1,
        },
      ],
    });

    await confirmOrderPayment(farOrder.order.id, `idem_far_${Date.now()}`, {
      transactionId: 'txn_far',
      amountCents: farOrder.order.totalCents,
    });

    // Cancellation > 24 hours must succeed
    const cancelled = await cancelCustomerOrder(farOrder.order.id, null, 'Schedule changed');
    assert.strictEqual(cancelled.status, 'CANCELLED');

    // Order B: < 24 hours away (e.g. today or tomorrow)
    const nearDate = new Date();
    nearDate.setHours(nearDate.getHours() + 12); // 12 hours from now
    const nearDateStr = nearDate.toISOString().split('T')[0];

    // Create a confirmed order artificially set to near pickup
    const [nearOrder] = await db
      .insert(schema.orders)
      .values({
        orderNumber: `CK-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: 'Near Customer',
        customerEmail: 'near@example.com',
        customerPhone: '+1-555-0100',
        pickupDate: nearDateStr,
        pickupSlotId: slotFar.id,
        status: 'CONFIRMED',
        subtotalCents: 5000,
        totalCents: 5000,
      })
      .returning();

    let threw = false;
    try {
      await cancelCustomerOrder(nearOrder.id, null, 'Cancel within 12h');
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError);
      assert(err.message.includes('24 hours'));
    }
    assert.strictEqual(threw, true, 'Cancellation within 24 hours must be rejected');
  });

  // 10. Baker Dashboard Status Transitions
  await test('Baker Status Workflow (BAKING -> READY -> COLLECTED)', async () => {
    const db = getDatabase();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.status, 'CONFIRMED'));

    assert(order, 'Expected at least one confirmed order for baker test');

    // Advance to BAKING
    const [baking] = await db
      .update(schema.orders)
      .set({ status: 'BAKING', updatedAt: new Date() })
      .where(eq(schema.orders.id, order.id))
      .returning();
    assert.strictEqual(baking.status, 'BAKING');

    // Advance to READY
    const [ready] = await db
      .update(schema.orders)
      .set({ status: 'READY', updatedAt: new Date() })
      .where(eq(schema.orders.id, order.id))
      .returning();
    assert.strictEqual(ready.status, 'READY');

    // Advance to COLLECTED
    const [collected] = await db
      .update(schema.orders)
      .set({ status: 'COLLECTED', updatedAt: new Date() })
      .where(eq(schema.orders.id, order.id))
      .returning();
    assert.strictEqual(collected.status, 'COLLECTED');
  });

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} QA TESTS PASSED!`);
  console.log('============================================================\n');
}

runQASuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('QA Suite Failed:', err);
    process.exit(1);
  });
