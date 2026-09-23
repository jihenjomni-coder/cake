'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  bookedOrders: number;
  availableOrders: number;
  isAvailable: boolean;
}

interface DateAvailability {
  id: string;
  date: string;
  maxCakes: number;
  reservedCakes: number;
  remainingCakes: number;
  isClosed: boolean;
  leadTimeValid: boolean;
  isAvailable: boolean;
  slots: Slot[];
}

export default function PickupSchedulePage() {
  const router = useRouter();
  const { pickupDate, pickupSlotId, setPickup, items } = useCart();

  const [dates, setDates] = useState<DateAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(pickupDate);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(pickupSlotId);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCapacity();
  }, []);

  const fetchCapacity = async () => {
    try {
      const res = await fetch('/api/capacity');
      if (res.ok) {
        const data = await res.json();
        setDates(data.dates || []);

        // Auto-select first available date if nothing selected yet
        if (!selectedDate && data.dates) {
          const firstOpen = data.dates.find((d: DateAvailability) => d.isAvailable);
          if (firstOpen) {
            setSelectedDate(firstOpen.date);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching capacity:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeDateObj = dates.find((d) => d.date === selectedDate);
  const availableSlots = activeDateObj?.slots || [];

  const handleSelectSlot = (slot: Slot) => {
    if (!slot.isAvailable || !selectedDate) return;

    setSelectedSlotId(slot.id);
    const windowStr = `${slot.startTime} - ${slot.endTime}`;
    setPickup(selectedDate, slot.id, windowStr);

    setConfirmedMessage(`Reserved slot: ${selectedDate} (${windowStr})`);
    setTimeout(() => setConfirmedMessage(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#EADBCE] pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFB] border border-[#EADBCE] text-xs font-semibold text-[#C97A2B] shadow-sm mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Strict 48-Hour Advance Baking Lead Time</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A1810]">
          Pickup Schedule & Oven Capacity
        </h1>
        <p className="text-sm text-[#5C4033] mt-2 max-w-2xl">
          To maintain small-batch perfection, our atelier limits total cakes baked per day. Select an open bakery date and your preferred 30-minute pickup window.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] animate-pulse" />
          <div className="h-60 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Date Grid */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#2A1810]">
                1. Select Bakery Pickup Date
              </h2>
              <span className="text-xs text-[#8C6D58]">Next 14 Days</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dates.map((dateObj) => {
                const dateInstance = new Date(dateObj.date + 'T00:00:00');
                const dayName = dateInstance.toLocaleDateString('en-US', { weekday: 'short' });
                const monthDay = dateInstance.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                const isSelected = selectedDate === dateObj.date;

                return (
                  <button
                    key={dateObj.id}
                    type="button"
                    disabled={!dateObj.isAvailable}
                    onClick={() => {
                      setSelectedDate(dateObj.date);
                      setSelectedSlotId(null);
                    }}
                    className={`relative p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#C97A2B] bg-[#FFFDFB] ring-2 ring-[#C97A2B]/20 shadow-md'
                        : dateObj.isAvailable
                        ? 'border-[#EADBCE] bg-[#FFFDFB] hover:border-[#C97A2B]/40 hover:shadow-sm'
                        : 'border-[#EADBCE]/50 bg-[#FAF7F2]/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C6D58]">
                        {dayName}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#C97A2B]" />
                      )}
                    </div>

                    <div className="font-serif text-lg font-bold text-[#2A1810] mt-1">
                      {monthDay}
                    </div>

                    <div className="mt-2 text-[11px]">
                      {!dateObj.leadTimeValid ? (
                        <span className="text-[#8C6D58] font-medium">Needs 48h lead</span>
                      ) : dateObj.isClosed ? (
                        <span className="text-[#D94E64] font-semibold">Atelier Closed</span>
                      ) : dateObj.remainingCakes === 0 ? (
                        <span className="text-[#D94E64] font-semibold">Sold Out</span>
                      ) : (
                        <span className="text-[#2E7D52] font-semibold">
                          {dateObj.remainingCakes} of {dateObj.maxCakes} cakes left
                        </span>
                      )}
                    </div>

                    {/* Capacity progress bar */}
                    {dateObj.leadTimeValid && !dateObj.isClosed && (
                      <div className="w-full h-1.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] mt-2 overflow-hidden">
                        <div
                          className="h-full bg-[#C97A2B] rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((dateObj.reservedCakes / dateObj.maxCakes) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Time Slots for Selected Date */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">
                  2. Select 30-Min Collection Window
                </h3>
                {selectedDate ? (
                  <p className="text-xs text-[#8C6D58] mt-1">
                    Available slots for{' '}
                    <strong className="text-[#2A1810]">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </strong>
                  </p>
                ) : (
                  <p className="text-xs text-[#8C6D58] mt-1">
                    Please select a date on the left to see available slots.
                  </p>
                )}
              </div>

              {/* Slot list */}
              <div className="space-y-2.5">
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#8C6D58]">
                    No pickup slots found for this date.
                  </div>
                ) : (
                  availableSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        id={`slot-${slot.id}`}
                        disabled={!slot.isAvailable}
                        onClick={() => handleSelectSlot(slot)}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                          isSelected
                            ? 'border-[#C97A2B] bg-[#FFFDFB] ring-2 ring-[#C97A2B]/20 shadow-sm'
                            : slot.isAvailable
                            ? 'border-[#EADBCE] bg-[#FFFDFB] hover:border-[#C97A2B]/40'
                            : 'border-[#EADBCE]/50 bg-[#FAF7F2] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock
                            className={`w-4 h-4 ${
                              isSelected ? 'text-[#C97A2B]' : 'text-[#8C6D58]'
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-sm text-[#2A1810]">
                              {slot.startTime} – {slot.endTime}
                            </span>
                            <span className="block text-[11px] text-[#8C6D58]">
                              {slot.isAvailable
                                ? `${slot.availableOrders} order spots open`
                                : 'Slot fully booked'}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#C97A2B]" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Confirmation toast message */}
              {confirmedMessage && (
                <div className="p-3.5 rounded-2xl bg-[#2E7D52]/10 border border-[#2E7D52]/20 flex items-center gap-2 text-xs font-semibold text-[#2E7D52] animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{confirmedMessage}</span>
                </div>
              )}

              {/* Action */}
              <div className="pt-4 border-t border-[#EADBCE] space-y-3">
                {items.length > 0 ? (
                  <button
                    type="button"
                    id="confirm-pickup-cart-btn"
                    disabled={!selectedSlotId}
                    onClick={() => router.push('/cart')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                  >
                    <span>Proceed to Cart & Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href="/menu"
                    id="pickup-go-to-menu-btn"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors shadow-md"
                  >
                    <span>Now Choose Your Cakes from Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
