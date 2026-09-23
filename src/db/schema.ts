import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  check,
  unique,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['CUSTOMER', 'BAKER']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'CONFIRMED',
  'BAKING',
  'READY',
  'COLLECTED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
]);
export const optionTypeEnum = pgEnum('option_type', ['SIZE', 'FLAVOUR']);

// 1. Users Table
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    role: userRoleEnum('role').default('CUSTOMER').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_role').on(table.role),
  ]
);

// 2. Categories Table
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_categories_slug').on(table.slug),
  ]
);

// 3. Products Table
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),
    basePriceCents: integer('base_price_cents').notNull(), // Money in integer minor units
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_products_slug').on(table.slug),
    index('idx_products_active').on(table.isActive),
  ]
);

// 4. Product Categories (Junction)
export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_product_cat_prod').on(table.productId),
    index('idx_product_cat_cat').on(table.categoryId),
  ]
);

// 5. Product Options (Sizes, Flavours)
export const productOptions = pgTable(
  'product_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    type: optionTypeEnum('type').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    priceModifierCents: integer('price_modifier_cents').default(0).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    inStock: boolean('in_stock').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_prod_opt_product').on(table.productId),
    index('idx_prod_opt_type').on(table.type),
  ]
);

// 6. Dietary Tags
export const dietaryTags = pgTable(
  'dietary_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 50 }).notNull(), // e.g., 'Eggless', 'Gluten-Free', 'Nut-Free'
    slug: varchar('slug', { length: 60 }).notNull().unique(),
    icon: varchar('icon', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// 7. Product Dietary Tags (Junction)
export const productDietaryTags = pgTable(
  'product_dietary_tags',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    dietaryTagId: uuid('dietary_tag_id')
      .notNull()
      .references(() => dietaryTags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_prod_diet_prod').on(table.productId),
    index('idx_prod_diet_tag').on(table.dietaryTagId),
  ]
);

// 8. Daily Capacity Table
export const dailyCapacity = pgTable(
  'daily_capacity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bakeryDate: date('bakery_date').notNull().unique(), // Unique constraint per bakery date
    maxCakes: integer('max_cakes').notNull(),
    reservedCakes: integer('reserved_cakes').default(0).notNull(),
    isClosed: boolean('is_closed').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'daily_capacity_check',
      sql`${table.reservedCakes} <= ${table.maxCakes} AND ${table.reservedCakes} >= 0`
    ),
    index('idx_daily_capacity_date').on(table.bakeryDate),
  ]
);

// 9. Pickup Slots Table
export const pickupSlots = pgTable(
  'pickup_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bakeryDate: date('bakery_date').notNull(),
    startTime: time('start_time').notNull(), // e.g., '10:00:00'
    endTime: time('end_time').notNull(),   // e.g., '10:30:00'
    maxOrders: integer('max_orders').default(3).notNull(),
    bookedOrders: integer('booked_orders').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'pickup_slot_booked_check',
      sql`${table.bookedOrders} <= ${table.maxOrders} AND ${table.bookedOrders} >= 0`
    ),
    index('idx_pickup_slots_date').on(table.bakeryDate),
    unique('pickup_slot_unique_time').on(table.bakeryDate, table.startTime),
  ]
);

// 10. Orders Table
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    pickupDate: date('pickup_date').notNull(),
    pickupSlotId: uuid('pickup_slot_id')
      .notNull()
      .references(() => pickupSlots.id),
    status: orderStatusEnum('status').default('PENDING').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    messageFeeCents: integer('message_fee_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_orders_status').on(table.status),
    index('idx_orders_pickup_date').on(table.pickupDate),
    index('idx_orders_user_id').on(table.userId),
    index('idx_orders_order_number').on(table.orderNumber),
  ]
);

// 11. Order Items Table
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    cakeName: varchar('cake_name', { length: 255 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    totalPriceCents: integer('total_price_cents').notNull(),
  },
  (table) => [
    index('idx_order_items_order_id').on(table.orderId),
  ]
);

// 12. Order Customisations Table
export const orderCustomisations = pgTable(
  'order_customisations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    sizeName: varchar('size_name', { length: 100 }).notNull(),
    flavourName: varchar('flavour_name', { length: 100 }).notNull(),
    // DB level constraint: Limit custom messages to 40 characters
    customMessage: varchar('custom_message', { length: 40 }),
    messageFeeCents: integer('message_fee_cents').default(0).notNull(),
    referenceImageUrl: text('reference_image_url'),
  },
  (table) => [
    index('idx_order_custom_item_id').on(table.orderItemId),
  ]
);

// 13. Payments Table
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).default('test_stripe').notNull(),
    transactionId: varchar('transaction_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 10 }).default('usd').notNull(),
    status: paymentStatusEnum('status').default('PENDING').notNull(),
    rawResponse: text('raw_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_order_id').on(table.orderId),
    index('idx_payments_idempotency').on(table.idempotencyKey),
    index('idx_payments_status').on(table.status),
  ]
);

// 14. Audit Logs Table
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'order', 'capacity', 'payment'
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),         // 'HOLD_CREATED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'
    actorId: varchar('actor_id', { length: 255 }),
    changes: text('changes'), // serialized json
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_entity').on(table.entityType, table.entityId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
  options: many(productOptions),
  dietaryTags: many(productDietaryTags),
  orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
}));

export const dietaryTagsRelations = relations(dietaryTags, ({ many }) => ({
  productDietaryTags: many(productDietaryTags),
}));

export const productDietaryTagsRelations = relations(productDietaryTags, ({ one }) => ({
  product: one(products, {
    fields: [productDietaryTags.productId],
    references: [products.id],
  }),
  dietaryTag: one(dietaryTags, {
    fields: [productDietaryTags.dietaryTagId],
    references: [dietaryTags.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  pickupSlot: one(pickupSlots, {
    fields: [orders.pickupSlotId],
    references: [pickupSlots.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  customisations: many(orderCustomisations),
}));

export const orderCustomisationsRelations = relations(orderCustomisations, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderCustomisations.orderItemId],
    references: [orderItems.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));
