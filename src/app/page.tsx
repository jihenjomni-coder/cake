import React from 'react';
import Link from 'next/link';
import {
  Cake,
  Calendar,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Award,
  ChevronRight,
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, asc, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getHomePageData() {
  try {
    const db = getDatabase();

    const featuredProducts = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.isActive, true))
      .limit(3);

    const categories = await db
      .select()
      .from(schema.categories)
      .orderBy(asc(schema.categories.displayOrder));

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingCapacity = await db
      .select()
      .from(schema.dailyCapacity)
      .where(gte(schema.dailyCapacity.bakeryDate, todayStr))
      .orderBy(asc(schema.dailyCapacity.bakeryDate))
      .limit(5);

    return { featuredProducts, categories, upcomingCapacity };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return { featuredProducts: [], categories: [], upcomingCapacity: [] };
  }
}

export default async function HomePage() {
  const { featuredProducts, categories, upcomingCapacity } = await getHomePageData();

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5EFE6] via-[#FAF7F2] to-[#FAF7F2] pt-16 pb-24 border-b border-[#EADBCE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDFB] border border-[#EADBCE] text-xs font-semibold text-[#C97A2B] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#C97A2B]" />
                <span>Small-Batch Artisan Bakery Atelier</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2A1810] leading-[1.15]">
                Freshly Baked Perfection. <br />
                <span className="italic font-normal text-[#C97A2B]">
                  Reserved Exclusively for You.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#5C4033] max-w-2xl leading-relaxed">
                We craft each cake by hand using slow-fermented sponges, French creams, and seasonal botanicals. To ensure perfection, our oven operates on strict daily capacity limits with scheduled pickup windows.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/menu"
                  id="hero-order-btn"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-sm font-semibold hover:bg-[#3D251B] transition-all hover:gap-3 shadow-lg shadow-[#2A1810]/15"
                >
                  <span>Explore Cake Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/pickup"
                  id="hero-calendar-btn"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FFFDFB] border border-[#EADBCE] text-sm font-semibold text-[#2A1810] hover:border-[#C97A2B] transition-colors"
                >
                  <Calendar className="w-4 h-4 text-[#C97A2B]" />
                  <span>Check Pickup Dates</span>
                </Link>
              </div>

              {/* Value Props */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#EADBCE]/80 text-xs sm:text-sm text-[#5C4033]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C97A2B] shrink-0" />
                  <span>48h Advance Notice</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C97A2B] shrink-0" />
                  <span>Strict Daily Limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C97A2B] shrink-0" />
                  <span>QR Pickup Verification</span>
                </div>
              </div>
            </div>

            {/* Right Visual / Capacity Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-6 shadow-xl shadow-[#2A1810]/5 space-y-6">
                <div className="flex items-center justify-between border-b border-[#EADBCE] pb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#2A1810]">
                      Upcoming Oven Schedule
                    </h3>
                    <p className="text-xs text-[#8C6D58]">Daily cake batch reservations</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#C97A2B] border border-[#EADBCE] text-[11px] font-semibold">
                    Live Capacity
                  </span>
                </div>

                <div className="space-y-4">
                  {upcomingCapacity.map((cap: any) => {
                    const dateStr = cap.bakeryDate instanceof Date 
                      ? cap.bakeryDate.toISOString().split('T')[0]
                      : String(cap.bakeryDate).split('T')[0];
                    const remaining = Math.max(0, cap.maxCakes - cap.reservedCakes);
                    const percent = Math.min(100, Math.round((cap.reservedCakes / cap.maxCakes) * 100));

                    return (
                      <div key={cap.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#2A1810]">
                            {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {cap.isClosed ? (
                            <span className="text-[#D94E64] font-semibold text-[11px]">Closed</span>
                          ) : (
                            <span className="text-[#5C4033] font-semibold">
                              {remaining} / {cap.maxCakes} cakes open
                            </span>
                          )}
                        </div>

                        {!cap.isClosed && (
                          <div className="w-full h-2 rounded-full bg-[#FAF7F2] border border-[#EADBCE] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent > 80
                                  ? 'bg-[#D94E64]'
                                  : percent > 50
                                  ? 'bg-[#C97A2B]'
                                  : 'bg-[#2E7D52]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Link
                    href="/pickup"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EADBCE]/50 text-xs font-semibold text-[#2A1810] border border-[#EADBCE] transition-colors"
                  >
                    <span>View All 14 Days & Slots</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Signature Cakes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-10 gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#C97A2B] font-bold">
              Artisan Creations
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#2A1810] mt-1">
              Signature Layer Cakes
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#C97A2B] hover:text-[#B06520] transition-colors"
          >
            <span>Browse Full Menu</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProducts.map((product: any) => (
            <div
              key={product.id}
              className="group flex flex-col rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#C97A2B]/40 transition-all duration-300"
            >
              {/* Product Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF7F2]">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#FFFDFB]/90 backdrop-blur-md border border-[#EADBCE] text-xs font-bold text-[#2A1810] shadow-sm">
                  From {formatMoney(product.basePriceCents)}
                </div>
              </div>

              {/* Product Content */}
              <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2A1810] group-hover:text-[#C97A2B] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#5C4033] mt-2 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EADBCE]/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#8C6D58]">
                    Custom Message Capable
                  </span>
                  <Link
                    href={`/menu/${product.slug}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors"
                  >
                    <span>Customize</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bakery Quality Pillars */}
      <section className="bg-[#FAF7F2] py-16 border-y border-[#EADBCE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#C97A2B]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2A1810]">48-Hour Slow Bake</h3>
              <p className="text-xs text-[#5C4033] leading-relaxed">
                Quality demands time. Every sponge is slow-fermented and chill-rested for 48 hours to lock in moisture and natural flavours.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#C97A2B]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2A1810]">Dietary Integrity</h3>
              <p className="text-xs text-[#5C4033] leading-relaxed">
                Dedicated eggless, gluten-free, and nut-free recipes created with uncompromising standards so every guest can celebrate safely.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#C97A2B]">
                <Cake className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2A1810]">Hand-Piped Messages</h3>
              <p className="text-xs text-[#5C4033] leading-relaxed">
                Personalize your cake with a custom chocolate or royal icing plaque up to 40 characters, hand-piped by our master decorator.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
