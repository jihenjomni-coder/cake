'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/formatMoney';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  QrCode,
  XCircle,
  ArrowLeft,
  Share2,
} from 'lucide-react';

interface OrderDetailProps {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    pickupDate: string;
    status: string;
    subtotalCents: number;
    messageFeeCents: number;
    totalCents: number;
    cancellationReason?: string;
    pickupSlot?: {
      startTime: string;
      endTime: string;
    };
    items: Array<{
      id: string;
      cakeName: string;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
      customisation?: {
        sizeName: string;
        flavourName: string;
        customMessage?: string;
        messageFeeCents: number;
      };
    }>;
    payments: Array<{
      id: string;
      provider: string;
      transactionId: string;
      amountCents: number;
      status: string;
    }>;
    qrCodeDataUrl: string;
  };
}

export default function OrderConfirmationView({ order: initialOrder }: OrderDetailProps) {
  const [order, setOrder] = useState(initialOrder);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed plans');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Calculate hours remaining until pickup
  const pickupDateStr = String(order.pickupDate).split('T')[0];

  const [year, month, day] = pickupDateStr.split('-').map(Number);
  const pickupTimeMs = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getTime();
  const hoursUntilPickup = (pickupTimeMs - Date.now()) / (1000 * 60 * 60);
  const canCancel = hoursUntilPickup >= 24 && (order.status === 'CONFIRMED' || order.status === 'PENDING');

  const handleCancelOrder = async () => {
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order.');
      }

      setOrder((prev) => ({
        ...prev,
        status: 'CANCELLED',
        cancellationReason: cancelReason,
      }));
      setShowCancelModal(false);
    } catch (err: any) {
      setCancelError(err.message || 'Error processing cancellation.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-[#2E7D52]/10 text-[#2E7D52] border-[#2E7D52]/20';
      case 'BAKING':
        return 'bg-[#C97A2B]/10 text-[#C97A2B] border-[#C97A2B]/20';
      case 'READY':
        return 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20';
      case 'COLLECTED':
        return 'bg-[#5C4033]/10 text-[#5C4033] border-[#5C4033]/20';
      case 'CANCELLED':
        return 'bg-[#D94E64]/10 text-[#D94E64] border-[#D94E64]/20';
      default:
        return 'bg-[#FAF7F2] text-[#8C6D58] border-[#EADBCE]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Confirmation Header */}
      <div className="p-8 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#2E7D52]/10 border border-[#2E7D52]/20 text-[#2E7D52] flex items-center justify-center mx-auto">
          {order.status === 'CANCELLED' ? (
            <XCircle className="w-8 h-8 text-[#D94E64]" />
          ) : (
            <CheckCircle2 className="w-8 h-8" />
          )}
        </div>

        <div>
          <span className="text-xs uppercase tracking-widest text-[#C97A2B] font-bold">
            Order Reference
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A1810]">
            {order.orderNumber}
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border capitalize"
          style={{}}
        >
          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(order.status)}`}>
            Status: {order.status}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#5C4033] max-w-lg mx-auto">
          {order.status === 'CANCELLED'
            ? 'This order has been cancelled and capacity released back to the oven.'
            : 'Thank you for your order! Your cakes are scheduled for small-batch baking. Please present your pickup QR code at the atelier.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* QR Code & Pickup Pass Column */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm text-center space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#2A1810] flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-[#C97A2B]" />
              <span>Pickup Collection Pass</span>
            </h3>

            {/* QR Image */}
            <div className="p-3 bg-white rounded-2xl border border-[#EADBCE] inline-block shadow-sm">
              <img
                src={order.qrCodeDataUrl}
                alt={`QR code for order ${order.orderNumber}`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="text-[11px] text-[#8C6D58]">
              Scan upon arrival at Atelier 4B for immediate collection verification.
            </p>

            {/* Atelier Address */}
            <div className="pt-3 border-t border-[#EADBCE]/60 text-left text-xs text-[#5C4033] space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C97A2B] shrink-0 mt-0.5" />
                <span>124 Artisan Row, Atelier 4B, London</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#C97A2B] shrink-0 mt-0.5" />
                <span>
                  Window:{' '}
                  <strong>
                    {order.pickupSlot
                      ? `${order.pickupSlot.startTime} – ${order.pickupSlot.endTime}`
                      : 'Scheduled Slot'}
                  </strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[#C97A2B] shrink-0 mt-0.5" />
                <span>
                  Date:{' '}
                  <strong>
                    {new Date(pickupDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Section (Cut-off: 24h before pickup) */}
          {order.status !== 'CANCELLED' && order.status !== 'COLLECTED' && (
            <div className="p-5 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2A1810]">Cancellation Policy</span>
                <span className="text-[11px] text-[#8C6D58]">24h Advance Cut-off</span>
              </div>

              {canCancel ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#5C4033]">
                    Eligible for cancellation until 24 hours prior to pickup. (
                    <strong>{hoursUntilPickup.toFixed(1)} hours remaining</strong>)
                  </p>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    id="order-cancel-trigger-btn"
                    className="w-full py-2.5 rounded-xl border border-[#D94E64] text-[#D94E64] text-xs font-semibold hover:bg-[#D94E64] hover:text-white transition-colors"
                  >
                    Cancel Order & Release Slot
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF7F2] text-[11px] text-[#8C6D58] leading-relaxed">
                  This order is within 24 hours of pickup atelier prep and can no longer be cancelled.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Details & Receipt Column */}
        <div className="md:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-[#2A1810]">
              Handcrafted Items
            </h3>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-1.5"
                >
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <h4 className="font-bold text-sm text-[#2A1810]">
                        {item.quantity}x {item.cakeName}
                      </h4>
                      <p className="text-xs text-[#5C4033] mt-0.5">
                        {item.customisation?.sizeName} · {item.customisation?.flavourName}
                      </p>
                      {item.customisation?.customMessage && (
                        <p className="text-xs italic text-[#C97A2B] mt-1">
                          Message: "{item.customisation.customMessage}" (+$
                          {(item.customisation.messageFeeCents / 100).toFixed(2)})
                        </p>
                      )}
                    </div>
                    <span className="font-serif text-sm font-bold text-[#2A1810]">
                      {formatMoney(item.totalPriceCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-xs text-[#5C4033] pt-4 border-t border-[#EADBCE]">
              <div className="flex justify-between">
                <span>Cakes Subtotal</span>
                <span>{formatMoney(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custom Message Plaques</span>
                <span>{formatMoney(order.messageFeeCents)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EADBCE] text-sm font-bold text-[#2A1810]">
                <span>Total Paid</span>
                <span>{formatMoney(order.totalCents)}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="pt-4 border-t border-[#EADBCE] text-xs text-[#5C4033] space-y-1">
              <p>
                <strong>Customer:</strong> {order.customerName}
              </p>
              <p>
                <strong>Email:</strong> {order.customerEmail}
              </p>
              <p>
                <strong>Phone:</strong> {order.customerPhone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-serif text-xl font-bold text-[#2A1810]">
              Cancel Order {order.orderNumber}?
            </h3>
            <p className="text-xs text-[#5C4033] leading-relaxed">
              Are you sure you want to cancel this cake order? Your reserved oven capacity and pickup slot will be immediately released.
            </p>

            <div>
              <label className="text-xs font-semibold text-[#5C4033] block mb-1">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-xs text-[#2A1810]"
              >
                <option value="Changed plans">Changed plans</option>
                <option value="Event rescheduled">Event rescheduled</option>
                <option value="Accidental order">Accidental order</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {cancelError && (
              <p className="text-xs text-[#D94E64] font-medium">{cancelError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#5C4033] hover:bg-[#FAF7F2]"
              >
                Keep Order
              </button>
              <button
                type="button"
                id="confirm-cancel-modal-btn"
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-[#D94E64] text-white text-xs font-semibold hover:bg-[#B91C1C] disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
