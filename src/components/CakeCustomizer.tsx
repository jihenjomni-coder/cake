'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatMoney } from '@/lib/formatMoney';
import {
  Sparkles,
  ShieldCheck,
  WheatOff,
  EggOff,
  Leaf,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  priceModifierCents: number;
  isDefault: boolean;
}

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    basePriceCents: number;
    sizes: ProductOption[];
    flavours: ProductOption[];
    categories: Array<{ id: string; name: string }>;
    dietaryTags: Array<{ id: string; name: string; slug: string }>;
  };
}

const MESSAGE_FEE_CENTS = 300; // $3.00

export default function CakeCustomizer({ product }: ProductDetailProps) {
  const router = useRouter();
  const { addItem, pickupDate } = useCart();

  // Selected state
  const defaultSize = product.sizes.find((s) => s.isDefault) || product.sizes[0];
  const defaultFlavour = product.flavours.find((f) => f.isDefault) || product.flavours[0];

  const [selectedSize, setSelectedSize] = useState<ProductOption>(defaultSize);
  const [selectedFlavour, setSelectedFlavour] = useState<ProductOption>(defaultFlavour);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  // Compute live price
  const sizePrice = selectedSize ? selectedSize.priceModifierCents : 0;
  const flavourPrice = selectedFlavour ? selectedFlavour.priceModifierCents : 0;
  const hasMessage = customMessage.trim().length > 0;
  const messageFee = hasMessage ? MESSAGE_FEE_CENTS : 0;
  const unitPrice = product.basePriceCents + sizePrice + flavourPrice;
  const totalPrice = unitPrice * quantity + messageFee * quantity;

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Strict 40 characters limit on client
    if (val.length <= 40) {
      setCustomMessage(val);
    }
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      sizeOptionId: selectedSize.id,
      sizeName: selectedSize.name,
      flavourOptionId: selectedFlavour.id,
      flavourName: selectedFlavour.name,
      customMessage: customMessage.trim() || undefined,
      messageFeeCents: messageFee,
      unitPriceCents: unitPrice,
      quantity,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Product Image Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#EADBCE] shadow-sm">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />

          {/* Live Message Overlay Preview */}
          {hasMessage && (
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-[#FFFDFB]/95 backdrop-blur-md border border-[#C97A2B] text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#C97A2B] block mb-1">
                Piped Inscription Preview
              </span>
              <p className="font-serif italic text-base text-[#2A1810]">
                "{customMessage}"
              </p>
            </div>
          )}
        </div>

        {/* Dietary Badges */}
        <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D58]">
            Allergen & Dietary Information
          </h4>
          <div className="flex flex-wrap gap-2">
            {product.dietaryTags.map((dt) => (
              <span
                key={dt.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-xs font-medium text-[#2A1810]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D52]" />
                <span>{dt.name} Recipe</span>
              </span>
            ))}
            {product.dietaryTags.length === 0 && (
              <span className="text-xs text-[#8C6D58]">Contains traditional dairy and gluten.</span>
            )}
          </div>
        </div>
      </div>

      {/* Customizer Controls Column */}
      <div className="lg:col-span-6 space-y-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C97A2B] font-bold">
            Artisan Customizer
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A1810] mt-1">
            {product.name}
          </h1>
          <p className="text-sm text-[#5C4033] mt-3 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Live Total Display */}
        <div className="p-5 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8C6D58] block">Customized Total</span>
            <span className="font-serif text-3xl font-bold text-[#2A1810]">
              {formatMoney(totalPrice)}
            </span>
          </div>
          <div className="text-right text-xs text-[#5C4033]">
            <p>{formatMoney(unitPrice)} base cake</p>
            {hasMessage && (
              <p className="text-[#C97A2B] font-semibold">
                +{formatMoney(messageFee)} inscription fee
              </p>
            )}
          </div>
        </div>

        {/* Step 1: Select Size */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#2A1810] block">
            1. Select Cake Size & Portions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {product.sizes.map((size) => (
              <button
                key={size.id}
                type="button"
                id={`size-option-${size.id}`}
                onClick={() => setSelectedSize(size)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSize?.id === size.id
                    ? 'border-[#C97A2B] bg-[#FFFDFB] ring-2 ring-[#C97A2B]/20 shadow-sm'
                    : 'border-[#EADBCE] bg-[#FFFDFB] hover:border-[#C97A2B]/40'
                }`}
              >
                <div className="font-semibold text-xs text-[#2A1810]">{size.name}</div>
                <div className="text-[11px] text-[#8C6D58] mt-1">
                  {size.priceModifierCents === 0
                    ? 'Included'
                    : `+${formatMoney(size.priceModifierCents)}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Flavour Infusion */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#2A1810] block">
            2. Select Filling & Flavour Infusion
          </label>
          <div className="space-y-2">
            {product.flavours.map((flavour) => (
              <button
                key={flavour.id}
                type="button"
                id={`flavour-option-${flavour.id}`}
                onClick={() => setSelectedFlavour(flavour)}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  selectedFlavour?.id === flavour.id
                    ? 'border-[#C97A2B] bg-[#FFFDFB] ring-2 ring-[#C97A2B]/20 shadow-sm'
                    : 'border-[#EADBCE] bg-[#FFFDFB] hover:border-[#C97A2B]/40'
                }`}
              >
                <span className="font-semibold text-xs text-[#2A1810]">
                  {flavour.name}
                </span>
                <span className="text-[11px] text-[#8C6D58]">
                  {flavour.priceModifierCents === 0
                    ? 'Included'
                    : `+${formatMoney(flavour.priceModifierCents)}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Custom Piped Message (Strict 40 chars) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#2A1810]">
              3. Custom Piped Message (Optional)
            </label>
            <span
              className={`text-xs font-mono font-medium ${
                customMessage.length >= 38 ? 'text-[#D94E64] font-bold' : 'text-[#8C6D58]'
              }`}
            >
              {customMessage.length}/40 chars
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              id="custom-message-input"
              maxLength={40}
              value={customMessage}
              onChange={handleMessageChange}
              placeholder="e.g. Happy 30th Birthday Elena! ✨"
              className="w-full px-4 py-3 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B] placeholder:text-[#8C6D58]/60 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8C6D58]">
            <span>Hand-piped on artisan chocolate plaque</span>
            <span className="font-semibold text-[#C97A2B]">+${(MESSAGE_FEE_CENTS / 100).toFixed(2)} inscription fee</span>
          </div>
        </div>

        {/* Quantity & Add to Cart */}
        <div className="pt-4 border-t border-[#EADBCE] space-y-4">
          <div className="flex items-center gap-4">
            {/* Quantity stepper */}
            <div className="flex items-center rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 text-[#5C4033] hover:text-[#2A1810] rounded-xl hover:bg-[#FAF7F2]"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-sm text-[#2A1810]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 text-[#5C4033] hover:text-[#2A1810] rounded-xl hover:bg-[#FAF7F2]"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              id="add-to-cart-btn"
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#2A1810] text-[#FFFDFB] font-semibold text-sm hover:bg-[#C97A2B] transition-colors shadow-lg shadow-[#2A1810]/10"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart ({formatMoney(totalPrice)})</span>
            </button>
          </div>

          {/* Feedback & Pickup notice */}
          {addedNotice && (
            <div className="p-4 rounded-2xl bg-[#2E7D52]/10 border border-[#2E7D52]/20 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E7D52]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cake added to your basket!</span>
              </div>
              <button
                onClick={() => router.push('/pickup')}
                className="text-xs font-bold text-[#2A1810] underline hover:text-[#C97A2B]"
              >
                {pickupDate ? 'Review Order in Cart' : 'Pick Date & Slot →'}
              </button>
            </div>
          )}

          {!pickupDate && (
            <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center gap-2 text-xs text-[#5C4033]">
              <Calendar className="w-4 h-4 text-[#C97A2B] shrink-0" />
              <span>
                Remember to schedule your pickup date & 30-minute slot before checkout.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
