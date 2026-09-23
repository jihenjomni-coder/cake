'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatMoney';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    pickupDate,
    pickupSlotId,
    pickupSlotTime,
    subtotalCents,
    messageFeeCents,
    totalCents,
    clearCart,
  } = useCart();
  const { user } = useAuth();

  // Form Fields
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('+1-555-0144');

  // Test Payment Fields
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [simulateFailure, setSimulateFailure] = useState(false);

  // 10-minute hold countdown timer (starts when checkout mounts)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes = 600s
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // If basket is empty or pickup date is missing, redirect
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2A1810]">
          Your cart is empty
        </h2>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  if (!pickupDate || !pickupSlotId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2A1810]">
          Pickup slot required
        </h2>
        <p className="text-xs text-[#5C4033]">
          Please schedule your pickup atelier window before finalizing payment.
        </p>
        <button
          onClick={() => router.push('/pickup')}
          className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold"
        >
          Select Pickup Date & Slot
        </button>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // 1. Create Pending Order with 10-min Capacity Hold
      const orderPayload = {
        customerName,
        customerEmail,
        customerPhone,
        pickupDate,
        pickupSlotId,
        items: items.map((i) => ({
          productId: i.productId,
          sizeOptionId: i.sizeOptionId,
          flavourOptionId: i.flavourOptionId,
          customMessage: i.customMessage,
          quantity: i.quantity,
        })),
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to reserve cake capacity.');
      }

      const pendingOrder = orderData.order;

      // 2. Process Test Payment with Idempotency Key
      const idempotencyKey = `pay_${pendingOrder.id}_${Date.now()}`;
      const paymentRes = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrder.id,
          idempotencyKey,
          paymentMethod: {
            brand: 'Visa',
            last4: cardNumber.replace(/\s+/g, '').slice(-4) || '4242',
            simulateFailure,
          },
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        throw new Error(paymentData.error || 'Payment failed.');
      }

      // 3. Clear cart and navigate to Order Confirmation page
      clearCart();
      router.push(`/orders/${pendingOrder.orderNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* 10-Minute Hold Reservation Banner */}
      <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#C97A2B]/40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#C97A2B] shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-[#2A1810] block">
              10-Minute Temporary Reservation Window
            </span>
            <span className="text-[#8C6D58]">
              Your cakes are temporarily held in our oven capacity while you complete payment.
            </span>
          </div>
        </div>
        <div className="text-right font-mono font-bold text-sm text-[#C97A2B] bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#EADBCE]">
          {secondsRemaining > 0 ? formatCountdown(secondsRemaining) : 'Hold Expired'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Checkout Form */}
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleSubmitOrder} className="space-y-8">
            {/* Customer Details */}
            <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#2A1810]">
                1. Customer & Collection Contact
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    id="checkout-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                      Email Address (for QR Receipt)
                    </label>
                    <input
                      type="email"
                      required
                      id="checkout-email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="sarah@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      id="checkout-phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1-555-0144"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Test Payment Provider */}
            <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-[#2A1810] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#C97A2B]" />
                  <span>2. Payment (Test Mode Active)</span>
                </h2>
                <span className="text-[10px] uppercase font-bold text-[#2E7D52] bg-[#2E7D52]/10 px-2 py-0.5 rounded-full border border-[#2E7D52]/20">
                  Stripe Test Mode
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    id="checkout-card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm font-mono text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm font-mono text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                      Security Code (CVC)
                    </label>
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-sm font-mono text-[#2A1810] focus:outline-none focus:border-[#C97A2B]"
                    />
                  </div>
                </div>

                {/* Test Mode Simulation Options */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5C4033]">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="accent-[#D94E64] rounded"
                    />
                    <span>
                      Simulate Test Card Failure / Decline (for QA testing)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-[#D94E64]/10 border border-[#D94E64]/20 flex items-start gap-3 text-xs text-[#D94E64] font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || secondsRemaining === 0}
              id="submit-payment-btn"
              className="w-full py-4 rounded-2xl bg-[#2A1810] text-[#FFFDFB] text-sm font-semibold hover:bg-[#C97A2B] disabled:opacity-50 transition-colors shadow-lg shadow-[#2A1810]/15 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Confirming Reservation & Payment...'
                  : `Pay & Confirm Order (${formatMoney(totalCents)})`}
              </span>
            </button>
          </form>
        </div>

        {/* Order Review Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-[#2A1810]">
              Pickup Atelier Details
            </h3>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1.5 text-xs text-[#5C4033]">
              <div className="flex items-center gap-2 font-bold text-[#2A1810]">
                <Calendar className="w-4 h-4 text-[#C97A2B]" />
                <span>
                  {new Date(pickupDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-[#C97A2B]">
                <Clock className="w-4 h-4" />
                <span>Collection Window: {pickupSlotTime}</span>
              </div>
              <p className="pt-2 text-[11px] text-[#8C6D58]">
                Atelier: 124 Artisan Row, Atelier 4B, London. Please show your confirmation QR code upon collection.
              </p>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D58]">
                Reserved Items
              </h4>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex justify-between items-start text-xs border-b border-[#EADBCE]/50 pb-2.5"
                  >
                    <div>
                      <span className="font-semibold text-[#2A1810]">
                        {item.quantity}x {item.name}
                      </span>
                      <p className="text-[11px] text-[#8C6D58]">
                        {item.sizeName} · {item.flavourName}
                      </p>
                      {item.customMessage && (
                        <p className="text-[11px] italic text-[#C97A2B]">
                          "{item.customMessage}"
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-[#2A1810]">
                      {formatMoney(
                        item.unitPriceCents * item.quantity +
                          item.messageFeeCents * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 text-xs text-[#5C4033] pt-2 border-t border-[#EADBCE]">
              <div className="flex justify-between">
                <span>Cakes Subtotal</span>
                <span>{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custom Message Fee</span>
                <span>{formatMoney(messageFeeCents)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EADBCE] text-sm font-bold text-[#2A1810]">
                <span>Total Due</span>
                <span>{formatMoney(totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
