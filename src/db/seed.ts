import { getDatabase } from './index';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  const db = getDatabase();

  // 1. Users
  const bakerPasswordHash = await bcrypt.hash('BakerPassword123!', 10);
  const customerPasswordHash = await bcrypt.hash('CustomerPassword123!', 10);

  console.log('👤 Seeding users...');
  const [bakerUser] = await db
    .insert(schema.users)
    .values({
      email: 'baker@cakecart.com',
      passwordHash: bakerPasswordHash,
      fullName: 'Chef Marceline Roux',
      phone: '+1-555-0199',
      role: 'BAKER',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { fullName: 'Chef Marceline Roux', role: 'BAKER', passwordHash: bakerPasswordHash },
    })
    .returning();

  const [customerUser] = await db
    .insert(schema.users)
    .values({
      email: 'customer@example.com',
      passwordHash: customerPasswordHash,
      fullName: 'Sarah Jenkins',
      phone: '+1-555-0144',
      role: 'CUSTOMER',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { fullName: 'Sarah Jenkins', role: 'CUSTOMER', passwordHash: customerPasswordHash },
    })
    .returning();

  // 2. Categories
  console.log('📂 Seeding categories...');
  const categoryData = [
    {
      name: 'Signature Layer Cakes',
      slug: 'signature-layer-cakes',
      description: 'Multi-tiered artisanal masterpieces with exquisite crumb and rich fillings.',
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
      displayOrder: 1,
    },
    {
      name: 'Celebration & Birthday',
      slug: 'celebration-birthday',
      description: 'Showstopping celebratory cakes designed for unforgettable moments.',
      imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
      displayOrder: 2,
    },
    {
      name: 'Botanical & Tea Cakes',
      slug: 'botanical-tea-cakes',
      description: 'Infused with floral notes, rare teas, and delicate seasonal botanicals.',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
      displayOrder: 3,
    },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categoryData) {
    const [inserted] = await db
      .insert(schema.categories)
      .values(cat)
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: cat,
      })
      .returning();
    createdCategories[cat.slug] = inserted;
  }

  // 3. Dietary Tags
  console.log('🏷️ Seeding dietary tags...');
  const dietaryData = [
    { name: 'Eggless', slug: 'eggless', icon: 'EggOff' },
    { name: 'Gluten-Free', slug: 'gluten-free', icon: 'WheatOff' },
    { name: 'Nut-Free', slug: 'nut-free', icon: 'ShieldCheck' },
    { name: 'Vegan', slug: 'vegan', icon: 'Leaf' },
  ];

  const createdDietaryTags: Record<string, any> = {};
  for (const tag of dietaryData) {
    const [inserted] = await db
      .insert(schema.dietaryTags)
      .values(tag)
      .onConflictDoUpdate({
        target: schema.dietaryTags.slug,
        set: tag,
      })
      .returning();
    createdDietaryTags[tag.slug] = inserted;
  }

  // 4. Products
  console.log('🎂 Seeding products & options...');
  const productsData = [
    {
      name: 'Belgian Dark Chocolate Ganache',
      slug: 'belgian-dark-chocolate-ganache',
      description: '70% Valrhona dark chocolate sponge, layered with silky fleur de sel caramel and covered in bittersweet velvet cocoa glaze.',
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 5600, // $56.00
      categories: ['signature-layer-cakes', 'celebration-birthday'],
      dietary: ['eggless', 'nut-free'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 1800, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 3800, isDefault: false },
      ],
      flavours: [
        { name: 'Fleur de Sel Caramel (Signature)', priceModifierCents: 0, isDefault: true },
        { name: 'Cold Brew Espresso Ganache', priceModifierCents: 400, isDefault: false },
        { name: 'Morello Cherry Infusion', priceModifierCents: 400, isDefault: false },
      ],
    },
    {
      name: 'Raspberry Pistachio Silk',
      slug: 'raspberry-pistachio-silk',
      description: 'Stone-ground Bronte pistachio crumb, layered with tart wild raspberry coulis and delicate white chocolate whipped velvet.',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 6400, // $64.00
      categories: ['signature-layer-cakes'],
      dietary: ['eggless'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 2000, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 4200, isDefault: false },
      ],
      flavours: [
        { name: 'Wild Raspberry & White Chocolate', priceModifierCents: 0, isDefault: true },
        { name: 'Orange Blossom Infused Ganache', priceModifierCents: 450, isDefault: false },
      ],
    },
    {
      name: 'Madagascan Vanilla Bean & Wild Strawberry',
      slug: 'madagascan-vanilla-bean-strawberry',
      description: 'Slow-steeped organic Bourbon vanilla bean chiffon cake with fragrant mountain strawberries and French butter creme.',
      imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 4800, // $48.00
      categories: ['celebration-birthday'],
      dietary: ['nut-free'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 1600, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 3400, isDefault: false },
      ],
      flavours: [
        { name: 'Wild Strawberry Crème (Signature)', priceModifierCents: 0, isDefault: true },
        { name: 'Madagascan Bourbon Vanilla Delight', priceModifierCents: 0, isDefault: false },
        { name: 'Passionfruit Curd Layer', priceModifierCents: 400, isDefault: false },
      ],
    },
    {
      name: 'Lemon Elderflower Cloud',
      slug: 'lemon-elderflower-cloud',
      description: 'Sun-drenched Amalfi lemon sponge, house-made lemon curd, and St. Germain elderflower whipped buttercream. Naturally gluten-free.',
      imageUrl: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 5200, // $52.00
      categories: ['botanical-tea-cakes'],
      dietary: ['gluten-free', 'nut-free'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 1800, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 3600, isDefault: false },
      ],
      flavours: [
        { name: 'Elderflower & Meyer Lemon', priceModifierCents: 0, isDefault: true },
        { name: 'Lavender Infused Honey', priceModifierCents: 400, isDefault: false },
      ],
    },
    {
      name: 'Matcha Uji Peach Reverie',
      slug: 'matcha-uji-peach-reverie',
      description: 'First-harvest Kyoto Uji matcha sponge layered with poached white peach compote and silky mascarpone cream.',
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 6200, // $62.00
      categories: ['botanical-tea-cakes', 'signature-layer-cakes'],
      dietary: ['eggless', 'nut-free', 'vegan'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 2000, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 4000, isDefault: false },
      ],
      flavours: [
        { name: 'Uji Matcha & Japanese White Peach', priceModifierCents: 0, isDefault: true },
        { name: 'Roasted Hojicha Ganache', priceModifierCents: 400, isDefault: false },
      ],
    },
    {
      name: 'Salted Caramel Pecan Praline',
      slug: 'salted-caramel-pecan-praline',
      description: 'Golden brown butter sponge, layered with slow-cooked caramel and hand-roasted Georgia pecan praline crunch.',
      imageUrl: 'https://images.unsplash.com/photo-1557925923-cd4648e211a0?auto=format&fit=crop&w=800&q=80',
      basePriceCents: 5800, // $58.00
      categories: ['signature-layer-cakes', 'celebration-birthday'],
      dietary: ['eggless'],
      sizes: [
        { name: '6" Petite (Serves 6-8)', priceModifierCents: 0, isDefault: true },
        { name: '8" Classic (Serves 12-16)', priceModifierCents: 1800, isDefault: false },
        { name: '10" Celebration (Serves 24-30)', priceModifierCents: 3800, isDefault: false },
      ],
      flavours: [
        { name: 'Salted Caramel & Praline (Classic)', priceModifierCents: 0, isDefault: true },
        { name: 'Smoked Bourbon Butterscotch', priceModifierCents: 500, isDefault: false },
      ],
    },
  ];

  for (const prod of productsData) {
    const [insertedProduct] = await db
      .insert(schema.products)
      .values({
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        imageUrl: prod.imageUrl,
        basePriceCents: prod.basePriceCents,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: prod.name,
          description: prod.description,
          imageUrl: prod.imageUrl,
          basePriceCents: prod.basePriceCents,
        },
      })
      .returning();

    // Link Categories
    for (const catSlug of prod.categories) {
      const category = createdCategories[catSlug];
      if (category) {
        await db
          .insert(schema.productCategories)
          .values({
            productId: insertedProduct.id,
            categoryId: category.id,
          })
          .onConflictDoNothing();
      }
    }

    // Link Dietary Tags
    for (const tagSlug of prod.dietary) {
      const tag = createdDietaryTags[tagSlug];
      if (tag) {
        await db
          .insert(schema.productDietaryTags)
          .values({
            productId: insertedProduct.id,
            dietaryTagId: tag.id,
          })
          .onConflictDoNothing();
      }
    }

    // Insert Sizes
    for (const size of prod.sizes) {
      await db
        .insert(schema.productOptions)
        .values({
          productId: insertedProduct.id,
          type: 'SIZE',
          name: size.name,
          priceModifierCents: size.priceModifierCents,
          isDefault: size.isDefault,
        })
        .onConflictDoNothing();
    }

    // Insert Flavours
    for (const flavour of prod.flavours) {
      await db
        .insert(schema.productOptions)
        .values({
          productId: insertedProduct.id,
          type: 'FLAVOUR',
          name: flavour.name,
          priceModifierCents: flavour.priceModifierCents,
          isDefault: flavour.isDefault,
        })
        .onConflictDoNothing();
    }
  }

  // 5. Daily Capacity for the next 14 days
  console.log('📅 Seeding 14 days of capacity and pickup slots...');
  const today = new Date();
  
  for (let i = 1; i <= 14; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Day 7 is set as a closed bakery day for testing closed dates
    const isClosed = i === 7;
    const maxCakes = i % 2 === 0 ? 12 : 8;
    const reservedCakes = i === 3 ? 2 : 0; // Some reserved on day 3

    await db
      .insert(schema.dailyCapacity)
      .values({
        bakeryDate: dateStr,
        maxCakes,
        reservedCakes,
        isClosed,
      })
      .onConflictDoUpdate({
        target: schema.dailyCapacity.bakeryDate,
        set: { maxCakes, isClosed },
      });

    // 6. Pickup Slots for the date
    const slotTimes = [
      { start: '10:00:00', end: '10:30:00' },
      { start: '11:30:00', end: '12:00:00' },
      { start: '13:30:00', end: '14:00:00' },
      { start: '15:00:00', end: '15:30:00' },
      { start: '16:30:00', end: '17:00:00' },
    ];

    for (const slot of slotTimes) {
      await db
        .insert(schema.pickupSlots)
        .values({
          bakeryDate: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          maxOrders: 3,
          bookedOrders: 0,
        })
        .onConflictDoNothing();
    }
  }

  console.log('✅ Seed complete! Users, products, categories, 14-day capacity and slots ready.');
}

if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
