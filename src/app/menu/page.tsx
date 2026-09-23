'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Filter,
  Search,
  SlidersHorizontal,
  Cake,
  ShieldCheck,
  WheatOff,
  EggOff,
  Leaf,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  basePriceCents: number;
  sizes: Array<{ id: string; name: string; priceModifierCents: number }>;
  flavours: Array<{ id: string; name: string; priceModifierCents: number }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  dietaryTags: Array<{ id: string; name: string; slug: string; icon: string }>;
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [dietaryTags, setDietaryTags] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDietary, setSelectedDietary] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(8000); // in cents ($80)

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedDietary]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedDietary !== 'all') params.set('dietary', selectedDietary);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories) setCategories(data.categories);
        if (data.dietaryTags) setDietaryTags(data.dietaryTags);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedDietary('all');
    setSearchQuery('');
    setMaxPrice(8000);
  };

  // Client-side price filter
  const displayedProducts = products.filter((p) => p.basePriceCents <= maxPrice);

  const getDietaryIcon = (slug: string) => {
    switch (slug) {
      case 'eggless':
        return <EggOff className="w-3 h-3 text-[#C97A2B]" />;
      case 'gluten-free':
        return <WheatOff className="w-3 h-3 text-[#2E7D52]" />;
      case 'nut-free':
        return <ShieldCheck className="w-3 h-3 text-[#3B82F6]" />;
      case 'vegan':
        return <Leaf className="w-3 h-3 text-[#10B981]" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#EADBCE] pb-8">
        <span className="text-xs uppercase tracking-widest text-[#C97A2B] font-bold">
          Small-Batch Collection
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A1810] mt-1">
          Artisan Cake Catalog
        </h1>
        <p className="text-sm text-[#5C4033] mt-2 max-w-2xl">
          Every cake is hand-assembled with choice ingredients. Select a cake to choose custom sizing, infusion flavours, and custom celebration messages.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]" />
            <input
              type="text"
              id="menu-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flavours, ingredients, names..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FFFDFB] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B] transition-colors"
            />
          </form>

          {/* Price Range Slider */}
          <div className="w-full md:w-auto flex items-center gap-4 bg-[#FFFDFB] px-5 py-2.5 rounded-full border border-[#EADBCE]">
            <span className="text-xs text-[#5C4033] font-medium whitespace-nowrap">
              Max Base Price: <strong className="text-[#2A1810]">{formatMoney(maxPrice)}</strong>
            </span>
            <input
              type="range"
              min={4000}
              max={8000}
              step={200}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="accent-[#C97A2B] w-32 cursor-pointer"
            />
          </div>

          {/* Reset */}
          {(selectedCategory !== 'all' || selectedDietary !== 'all' || searchQuery || maxPrice < 8000) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-[#D94E64] font-medium hover:underline self-end md:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-semibold text-[#8C6D58] uppercase tracking-wider mr-2">
            Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#2A1810] text-[#FFFDFB]'
                : 'bg-[#FFFDFB] text-[#5C4033] border border-[#EADBCE] hover:border-[#C97A2B]'
            }`}
          >
            All Creations
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.slug
                  ? 'bg-[#2A1810] text-[#FFFDFB]'
                  : 'bg-[#FFFDFB] text-[#5C4033] border border-[#EADBCE] hover:border-[#C97A2B]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Dietary Tag Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#8C6D58] uppercase tracking-wider mr-2">
            Dietary:
          </span>
          <button
            onClick={() => setSelectedDietary('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedDietary === 'all'
                ? 'bg-[#C97A2B] text-white'
                : 'bg-[#FFFDFB] text-[#5C4033] border border-[#EADBCE] hover:border-[#C97A2B]'
            }`}
          >
            Any Dietary
          </button>
          {dietaryTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedDietary(tag.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedDietary === tag.slug
                  ? 'bg-[#C97A2B] text-white'
                  : 'bg-[#FFFDFB] text-[#5C4033] border border-[#EADBCE] hover:border-[#C97A2B]'
              }`}
            >
              {getDietaryIcon(tag.slug)}
              <span>{tag.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] animate-pulse"
            />
          ))}
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-10 space-y-4">
          <Cake className="w-12 h-12 text-[#C97A2B] mx-auto opacity-70" />
          <h3 className="font-serif text-xl font-bold text-[#2A1810]">
            No cakes matched your filter
          </h3>
          <p className="text-xs text-[#5C4033] max-w-sm mx-auto">
            Try adjusting your search criteria, dietary tag, or price slider to see more handcrafted options.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedProducts.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#C97A2B]/40 transition-all duration-300"
            >
              {/* Image & Price */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF7F2]">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#FFFDFB]/95 backdrop-blur-md border border-[#EADBCE] text-xs font-bold text-[#2A1810] shadow-sm">
                  From {formatMoney(product.basePriceCents)}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  {/* Dietary Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {product.dietaryTags.map((dt) => (
                      <span
                        key={dt.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#EADBCE] text-[10px] font-semibold text-[#5C4033]"
                      >
                        {getDietaryIcon(dt.slug)}
                        <span>{dt.name}</span>
                      </span>
                    ))}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-[#2A1810] group-hover:text-[#C97A2B] transition-colors">
                    {product.name}
                  </h3>

                  <p className="text-xs text-[#5C4033] line-clamp-3 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Sizing & Flavours preview */}
                <div className="space-y-3 pt-3 border-t border-[#EADBCE]/60">
                  <div className="text-[11px] text-[#8C6D58]">
                    Available in {product.sizes.length} sizes (6", 8", 10")
                  </div>

                  <Link
                    href={`/menu/${product.slug}`}
                    id={`customize-${product.slug}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors shadow-sm"
                  >
                    <span>Customize & Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
