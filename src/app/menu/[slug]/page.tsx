import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import CakeCustomizer from '@/components/CakeCustomizer';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getProductBySlug(slug: string) {
  try {
    const db = getDatabase();

    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, slug));

    if (!product) return null;

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

    return {
      ...product,
      sizes,
      flavours,
      categories,
      dietaryTags,
    };
  } catch (err) {
    console.error('Error in getProductBySlug:', err);
    return null;
  }
}

export default async function CakeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6D58] hover:text-[#2A1810] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Artisan Menu</span>
        </Link>
      </div>

      <CakeCustomizer product={product} />
    </div>
  );
}
