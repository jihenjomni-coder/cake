'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatMoney } from '@/lib/formatMoney';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  Cake,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    pickupDate,
    pickupSlotTime,
    removeItem,
    updateQuantity,
    subtotalCents,
    messageFeeCents,
    totalCents,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#FFFDFB] border border-[#EADBCE] flex items-center justify-center mx-auto text-[#C97A2B] shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#2A1810]">
          Your Cake Basket is Empty
        </h1>
        <p className="text-sm text-[#5C4033] max-w-sm mx-auto">
          Explore our seasonal collection of small-batch artisan layer cakes and celebration tortes.
        </p>
        <Link
          href="/menu"
          id="cart-browse-menu-btn"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors"
        >
          <span>Explore Artisan Menu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const hasPickup = Boolean(pickupDate && pickupSlotTime);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-[#EADBCE] pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A1810]">
          Your Cake Basket ({items.length})
        </h1>
        <p className="text-sm text-[#5C4033] mt-1">
          Review your customized selections and scheduled pickup atelier slot.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.cartItemId}
              className="p-5 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
            >
              {/* Product Info */}
              <div className="flex items-center gap-4">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-[#EADBCE]"
                />
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold text-[#2A1810]">
                    {item.name}
                  </h3>
                  <div className="text-xs text-[#5C4033] space-y-0.5">
                    <p>
                      <strong>Size:</strong> {item.sizeName}
                    </p>
                    <p>
                      <strong>Flavour:</strong> {item.flavourName}
                    </p>
                    {item.customMessage && (
                      <p className="italic text-[#C97A2B]">
                        <strong>Message:</strong> "{item.customMessage}" (+$
                        {(item.messageFeeCents / 100).toFixed(2)})
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#2A1810] pt-1">
                    {formatMoney(item.unitPriceCents)} each
                  </div>
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="flex items-center gap-6 self-end sm:self-center">
                {/* Stepper */}
                <div className="flex items-center rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-1">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    className="p-1.5 text-[#5C4033] hover:text-[#2A1810] rounded-lg"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-[#2A1810]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                    className="p-1.5 text-[#5C4033] hover:text-[#2A1810] rounded-lg"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="font-serif text-base font-bold text-[#2A1810] w-20 text-right">
                  {formatMoney(
                    item.unitPriceCents * item.quantity +
                      item.messageFeeCents * item.quantity
                  )}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.cartItemId)}
                  className="p-2 text-[#8C6D58] hover:text-[#D94E64] transition-colors"
                  title="Remove cake"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Pickup Schedule Box */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pickup Selection Card */}
          <div className="rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#2A1810] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C97A2B]" />
              <span>Scheduled Pickup Slot</span>
            </h3>

            {hasPickup ? (
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1">
                <div className="text-xs text-[#8C6D58]">Date:</div>
                <div className="font-semibold text-sm text-[#2A1810]">
                  {new Date(pickupDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-[#8C6D58] pt-1">Window:</div>
                <div className="font-semibold text-sm text-[#C97A2B]">
                  {pickupSlotTime}
                </div>
                <div className="pt-2">
                  <Link
                    href="/pickup"
                    className="text-xs text-[#2A1810] underline hover:text-[#C97A2B]"
                  >
                    Change Pickup Date or Slot
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#D94E64]/10 border border-[#D94E64]/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D94E64]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Pickup Slot Required</span>
                </div>
                <p className="text-xs text-[#5C4033]">
                  Please select your bakery date and 30-minute collection window before checking out.
                </p>
                <Link
                  href="/pickup"
                  id="cart-select-slot-btn"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D94E64] underline hover:text-[#2A1810]"
                >
                  <span>Select Slot in Calendar →</span>
                </Link>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          <div className="rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#2A1810]">
              Price Summary
            </h3>

            <div className="space-y-2 text-xs text-[#5C4033]">
              <div className="flex justify-between">
                <span>Cakes Subtotal</span>
                <span className="font-semibold text-[#2A1810]">
                  {formatMoney(subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Custom Message Plaques</span>
                <span className="font-semibold text-[#2A1810]">
                  {formatMoney(messageFeeCents)}
                </span>
              </div>
              <div className="flex justify-between text-[#2E7D52]">
                <span>Artisan Atelier Pickup</span>
                <span className="font-semibold">Free</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EADBCE] flex justify-between items-baseline">
              <span className="font-serif text-base font-bold text-[#2A1810]">
                Final Total
              </span>
              <span className="font-serif text-2xl font-bold text-[#2A1810]">
                {formatMoney(totalCents)}
              </span>
            </div>

            <button
              onClick={() => router.push(hasPickup ? '/checkout' : '/pickup')}
              id="cart-checkout-btn"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors shadow-md shadow-[#2A1810]/10"
            >
              <span>{hasPickup ? 'Proceed to Checkout' : 'Select Pickup Slot First'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
