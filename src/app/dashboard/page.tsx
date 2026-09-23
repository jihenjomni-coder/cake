'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatMoney';
import {
  ChefHat,
  Calendar,
  Clock,
  CheckCircle2,
  Flame,
  PackageCheck,
  ShoppingBag,
  Sliders,
  AlertTriangle,
  RotateCcw,
  User,
  Phone,
  Power,
  Search,
} from 'lucide-react';

interface OrderItem {
  id: string;
  cakeName: string;
  quantity: number;
  totalPriceCents: number;
  customisation?: {
    sizeName: string;
    flavourName: string;
    customMessage?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string;
  status: string;
  totalCents: number;
  items: OrderItem[];
  pickupSlot?: {
    startTime: string;
    endTime: string;
  };
}

interface CapacityDay {
  id: string;
  bakeryDate: string;
  maxCakes: number;
  reservedCakes: number;
  isClosed: boolean;
}

export default function BakerDashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'CAPACITY'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [capacities, setCapacities] = useState<CapacityDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    if (user?.role === 'BAKER') {
      fetchOrders();
      fetchCapacities();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, filterDate, filterStatus]);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const res = await fetch(`/api/baker/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch baker orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapacities = async () => {
    try {
      const res = await fetch('/api/baker/capacity');
      if (res.ok) {
        const data = await res.json();
        setCapacities(data.capacities || []);
      }
    } catch (err) {
      console.error('Failed to fetch capacities:', err);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/baker/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order status');
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showFeedback(`Order marked as ${newStatus}!`);
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  const handleUpdateCapacity = async (
    bakeryDate: string,
    maxCakes: number,
    isClosed: boolean
  ) => {
    try {
      const res = await fetch('/api/baker/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bakeryDate, maxCakes, isClosed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update capacity');
      }

      setCapacities((prev) =>
        prev.map((c) =>
          c.bakeryDate === bakeryDate ? { ...c, maxCakes, isClosed } : c
        )
      );
      showFeedback(`Updated capacity for ${bakeryDate}`);
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 space-y-6">
        <div className="h-10 w-64 bg-[#FFFDFB] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#FFFDFB] rounded-3xl border border-[#EADBCE] animate-pulse" />
      </div>
    );
  }

  // Access denied if not BAKER
  if (!user || user.role !== 'BAKER') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#D94E64]/10 text-[#D94E64] flex items-center justify-center mx-auto">
          <ChefHat className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#2A1810]">
          Baker Atelier Access Only
        </h2>
        <p className="text-xs text-[#5C4033]">
          This dashboard is reserved for head bakery staff to manage batch queues, status transitions, and daily capacity.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold"
        >
          Sign In as Baker
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADBCE] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D52] animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-[#C97A2B] font-bold">
              Atelier Command Center
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#2A1810] mt-1">
            Baker Atelier Dashboard
          </h1>
          <p className="text-xs text-[#5C4033]">
            Logged in as <strong>{user.fullName}</strong> ({user.email})
          </p>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#EADBCE]">
          <button
            onClick={() => setActiveTab('ORDERS')}
            id="tab-baker-orders"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ORDERS'
                ? 'bg-[#2A1810] text-[#FFFDFB] shadow-sm'
                : 'text-[#5C4033] hover:text-[#2A1810]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders Queue ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CAPACITY')}
            id="tab-baker-capacity"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CAPACITY'
                ? 'bg-[#2A1810] text-[#FFFDFB] shadow-sm'
                : 'text-[#5C4033] hover:text-[#2A1810]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Capacity & Schedule</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-[#2E7D52]/10 border-[#2E7D52]/20 text-[#2E7D52]'
              : 'bg-[#D94E64]/10 border-[#D94E64]/20 text-[#D94E64]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: ORDERS QUEUE */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#8C6D58] block mb-1">
                  Filter by Pickup Date:
                </label>
                <input
                  type="date"
                  id="baker-date-filter"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-xs text-[#2A1810]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8C6D58] block mb-1">
                  Status:
                </label>
                <select
                  id="baker-status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-xs text-[#2A1810]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED (Queued)</option>
                  <option value="BAKING">BAKING (In Oven)</option>
                  <option value="READY">READY (At Atelier)</option>
                  <option value="COLLECTED">COLLECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {(filterDate || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterStatus('ALL');
                }}
                className="text-xs text-[#D94E64] font-medium hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-[#C97A2B] mx-auto opacity-70" />
              <h3 className="font-serif text-lg font-bold text-[#2A1810]">
                No orders match your filter
              </h3>
              <p className="text-xs text-[#5C4033]">
                Try selecting a different pickup date or status.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const dateStr = String(order.pickupDate).split('T')[0];

                return (
                  <div
                    key={order.id}
                    className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-4 hover:border-[#C97A2B]/40 transition-colors"
                  >
                    {/* Top Row: Ref, Customer, Slot, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADBCE]/50 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-3">
                          <span className="font-serif text-lg font-bold text-[#2A1810]">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              order.status === 'CONFIRMED'
                                ? 'bg-[#2E7D52]/10 text-[#2E7D52] border-[#2E7D52]/20'
                                : order.status === 'BAKING'
                                ? 'bg-[#C97A2B]/10 text-[#C97A2B] border-[#C97A2B]/20'
                                : order.status === 'READY'
                                ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
                                : order.status === 'COLLECTED'
                                ? 'bg-[#5C4033]/10 text-[#5C4033] border-[#5C4033]/20'
                                : 'bg-[#D94E64]/10 text-[#D94E64] border-[#D94E64]/20'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#5C4033]">
                          <span className="font-semibold text-[#2A1810]">
                            {order.customerName}
                          </span>
                          <span className="text-[#8C6D58]">{order.customerPhone}</span>
                        </div>
                      </div>

                      {/* Pickup Window */}
                      <div className="text-right text-xs">
                        <div className="flex items-center gap-1 font-semibold text-[#2A1810] justify-end">
                          <Calendar className="w-3.5 h-3.5 text-[#C97A2B]" />
                          <span>{dateStr}</span>
                        </div>
                        {order.pickupSlot && (
                          <div className="flex items-center gap-1 text-[#C97A2B] font-bold justify-end mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {order.pickupSlot.startTime} – {order.pickupSlot.endTime}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cake Items Breakdown */}
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#2A1810]">
                              {item.quantity}x {item.cakeName}
                            </span>
                            <span className="text-[#5C4033] ml-2">
                              ({item.customisation?.sizeName} · {item.customisation?.flavourName})
                            </span>

                            {item.customisation?.customMessage && (
                              <div className="mt-1 p-2 rounded-xl bg-white border border-[#C97A2B]/40 text-[#2A1810] font-serif italic text-xs">
                                <strong>Piped Message:</strong> "{item.customisation.customMessage}"
                              </div>
                            )}
                          </div>

                          <span className="font-bold text-[#2A1810] sm:text-right">
                            {formatMoney(item.totalPriceCents)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Status Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-2 justify-end">
                      <span className="text-xs text-[#8C6D58] mr-2">
                        Advance Status:
                      </span>

                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'BAKING')}
                          id={`action-baking-${order.orderNumber}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C97A2B] text-white text-xs font-semibold hover:bg-[#B06520] transition-colors shadow-sm"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Mark BAKING</span>
                        </button>
                      )}

                      {order.status === 'BAKING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          id={`action-ready-${order.orderNumber}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-semibold hover:bg-[#2563EB] transition-colors shadow-sm"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Mark READY</span>
                        </button>
                      )}

                      {order.status === 'READY' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'COLLECTED')}
                          id={`action-collected-${order.orderNumber}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D52] text-white text-xs font-semibold hover:bg-[#236340] transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark COLLECTED</span>
                        </button>
                      )}

                      {order.status !== 'COLLECTED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                          className="px-3 py-2 rounded-xl border border-[#D94E64] text-[#D94E64] text-xs font-semibold hover:bg-[#D94E64] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAPACITY & SCHEDULE */}
      {activeTab === 'CAPACITY' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm space-y-2">
            <h2 className="font-serif text-xl font-bold text-[#2A1810]">
              Oven Daily Capacity & Atelier Blackout Dates
            </h2>
            <p className="text-xs text-[#5C4033]">
              Configure maximum cakes bakeable per day or toggle closed dates for deep cleaning or holidays.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capacities.map((day) => {
              const dateStr = String(day.bakeryDate).split('T')[0];

              return (
                <div
                  key={day.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    day.isClosed
                      ? 'bg-[#FAF7F2]/60 border-[#D94E64]/40'
                      : 'bg-[#FFFDFB] border-[#EADBCE]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-[#2A1810]">
                      {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() =>
                        handleUpdateCapacity(dateStr, day.maxCakes, !day.isClosed)
                      }
                      id={`toggle-close-${dateStr}`}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                        day.isClosed
                          ? 'bg-[#D94E64] text-white hover:bg-[#B91C1C]'
                          : 'bg-[#2E7D52]/10 text-[#2E7D52] hover:bg-[#2E7D52] hover:text-white'
                      }`}
                    >
                      {day.isClosed ? 'Closed (Click to Open)' : 'Open (Click to Close)'}
                    </button>
                  </div>

                  {/* Reserved vs Max */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5C4033]">Reserved Cakes:</span>
                      <strong className="text-[#2A1810]">
                        {day.reservedCakes} / {day.maxCakes}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#8C6D58]">Max Batch:</label>
                      <input
                        type="number"
                        min={day.reservedCakes}
                        max={30}
                        defaultValue={day.maxCakes}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val !== day.maxCakes) {
                            handleUpdateCapacity(dateStr, val, day.isClosed);
                          }
                        }}
                        className="w-20 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#EADBCE] text-xs font-bold text-[#2A1810]"
                      />
                      <span className="text-[10px] text-[#8C6D58]">cakes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
