import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const dietarySlug = searchParams.get('dietary');
    const searchQuery = searchParams.get('search')?.toLowerCase();
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined;

    const db = getDatabase();

    // Query active products
    const productList = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.isActive, true));

    // Fetch relations
    const allOptions = await db.select().from(schema.productOptions);
    const allCategories = await db.select().from(schema.categories);
    const allProdCats = await db.select().from(schema.productCategories);
    const allTags = await db.select().from(schema.dietaryTags);
    const allProdTags = await db.select().from(schema.productDietaryTags);

    const enrichedProducts = productList.map((product: any) => {
      // Options
      const options = allOptions.filter((opt: any) => opt.productId === product.id);
      const sizes = options.filter((opt: any) => opt.type === 'SIZE');
      const flavours = options.filter((opt: any) => opt.type === 'FLAVOUR');

      // Categories
      const catLinks = allProdCats.filter((pc: any) => pc.productId === product.id);
      const cats = catLinks.map((link: any) => allCategories.find((c: any) => c.id === link.categoryId)).filter(Boolean);

      // Dietary tags
      const tagLinks = allProdTags.filter((pt: any) => pt.productId === product.id);
      const tags = tagLinks.map((link: any) => allTags.find((t: any) => t.id === link.dietaryTagId)).filter(Boolean);

      return {
        ...product,
        sizes,
        flavours,
        categories: cats,
        dietaryTags: tags,
      };
    });

    // Apply Filters
    let filtered = enrichedProducts;

    if (categorySlug && categorySlug !== 'all') {
      filtered = filtered.filter((p: any) =>
        p.categories.some((c: any) => c.slug === categorySlug)
      );
    }

    if (dietarySlug && dietarySlug !== 'all') {
      filtered = filtered.filter((p: any) =>
        p.dietaryTags.some((t: any) => t.slug === dietarySlug)
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p: any) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.description.toLowerCase().includes(searchQuery)
      );
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      filtered = filtered.filter((p: any) => p.basePriceCents >= minPrice);
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      filtered = filtered.filter((p: any) => p.basePriceCents <= maxPrice);
    }

    return NextResponse.json({
      products: filtered,
      categories: allCategories,
      dietaryTags: allTags,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
