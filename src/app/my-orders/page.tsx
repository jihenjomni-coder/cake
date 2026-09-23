'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatMoney';
import {
  ShoppingBag,
  Calendar,
  Clock,
  ArrowRight,
  QrCode,
  AlertCircle,
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
  pickupDate: string;
  status: string;
  totalCents: number;
  items: OrderItem[];
  pickupSlot?: {
    startTime: string;
    endTime: string;
  };
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCustomerOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchCustomerOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-4">
        <div className="h-8 w-48 bg-[#FFFDFB] rounded-xl animate-pulse" />
        <div className="h-40 bg-[#FFFDFB] rounded-3xl border border-[#EADBCE] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2A1810]">
          Please Sign In
        </h2>
        <p className="text-xs text-[#5C4033]">
          Sign in to view your small-batch cake orders, pickup schedule, and collection passes.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#EADBCE] pb-6">
        <h1 className="font-serif text-3xl font-bold text-[#2A1810]">My Cake Orders</h1>
        <p className="text-xs text-[#5C4033] mt-1">
          Track current atelier baking progress, scheduled pickup times, and view your collection passes.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-[#C97A2B] mx-auto opacity-70" />
          <h3 className="font-serif text-xl font-bold text-[#2A1810]">
            No Orders Placed Yet
          </h3>
          <p className="text-xs text-[#5C4033] max-w-sm mx-auto">
            Ready to celebrate? Browse our collection of handcrafted cakes and reserve your oven slot.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FFFDFB] text-xs font-semibold hover:bg-[#C97A2B] transition-colors"
          >
            <span>Explore Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const dateStr = String(order.pickupDate).split('T')[0];

            return (
              <div
                key={order.id}
                className="p-6 rounded-3xl bg-[#FFFDFB] border border-[#EADBCE] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#C97A2B]/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg font-bold text-[#2A1810]">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusBadge(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C4033]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#C97A2B]" />
                      <span>
                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {order.pickupSlot && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#C97A2B]" />
                        <span>
                          {order.pickupSlot.startTime} – {order.pickupSlot.endTime}
                        </span>
                      </div>
                    )}

                    <span className="font-bold text-[#2A1810]">
                      {formatMoney(order.totalCents)}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-[#8C6D58] pt-1">
                    {order.items.map((i) => `${i.quantity}x ${i.cakeName}`).join(', ')}
                  </div>
                </div>

                {/* View Confirmation Link */}
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FAF7F2] border border-[#EADBCE] text-xs font-semibold text-[#2A1810] hover:bg-[#2A1810] hover:text-[#FFFDFB] transition-colors self-end md:self-center shadow-sm"
                >
                  <QrCode className="w-4 h-4 text-[#C97A2B]" />
                  <span>View Pickup Pass & Details</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
