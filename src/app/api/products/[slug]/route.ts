import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDatabase();

    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, slug));

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Options
    const options = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, product.id));

    const sizes = options.filter((o: any) => o.type === 'SIZE');
    const flavours = options.filter((o: any) => o.type === 'FLAVOUR');

    // Categories
    const allCategories = await db.select().from(schema.categories);
    const prodCats = await db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.productId, product.id));
    const categories = prodCats
      .map((pc: any) => allCategories.find((c: any) => c.id === pc.categoryId))
      .filter(Boolean);

    // Dietary
    const allTags = await db.select().from(schema.dietaryTags);
    const prodTags = await db
      .select()
      .from(schema.productDietaryTags)
      .where(eq(schema.productDietaryTags.productId, product.id));
    const dietaryTags = prodTags
      .map((pt: any) => allTags.find((t: any) => t.id === pt.dietaryTagId))
      .filter(Boolean);

    return NextResponse.json({
      product: {
        ...product,
        sizes,
        flavours,
        categories,
        dietaryTags,
      },
    });
  } catch (error: any) {
    console.error('Error fetching product by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
