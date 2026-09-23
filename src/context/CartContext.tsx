'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  imageUrl: string;
  sizeOptionId: string;
  sizeName: string;
  flavourOptionId: string;
  flavourName: string;
  customMessage?: string;
  messageFeeCents: number;
  unitPriceCents: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  pickupDate: string | null;
  pickupSlotId: string | null;
  pickupSlotTime: string | null;
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setPickup: (date: string, slotId: string, slotTime: string) => void;
  clearCart: () => void;
  subtotalCents: number;
  messageFeeCents: number;
  totalCents: number;
  totalItemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickupSlotId, setPickupSlotId] = useState<string | null>(null);
  const [pickupSlotTime, setPickupSlotTime] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cakecart_cart_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (parsed.pickupDate) setPickupDate(parsed.pickupDate);
        if (parsed.pickupSlotId) setPickupSlotId(parsed.pickupSlotId);
        if (parsed.pickupSlotTime) setPickupSlotTime(parsed.pickupSlotTime);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem(
        'cakecart_cart_v1',
        JSON.stringify({ items, pickupDate, pickupSlotId, pickupSlotTime })
      );
    } catch {
      // ignore
    }
  }, [items, pickupDate, pickupSlotId, pickupSlotTime]);

  const addItem = (newItem: Omit<CartItem, 'cartItemId'>) => {
    const cartItemId = `${newItem.productId}-${newItem.sizeOptionId}-${newItem.flavourOptionId}-${newItem.customMessage || ''}-${Date.now()}`;
    setItems((prev) => [...prev, { ...newItem, cartItemId }]);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item))
    );
  };

  const setPickup = (date: string, slotId: string, slotTime: string) => {
    setPickupDate(date);
    setPickupSlotId(slotId);
    setPickupSlotTime(slotTime);
  };

  const clearCart = () => {
    setItems([]);
    setPickupDate(null);
    setPickupSlotId(null);
    setPickupSlotTime(null);
    try {
      localStorage.removeItem('cakecart_cart_v1');
    } catch {
      // ignore
    }
  };

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  const messageFeeCents = items.reduce(
    (sum, item) => sum + item.messageFeeCents * item.quantity,
    0
  );

  const totalCents = subtotalCents + messageFeeCents;
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        pickupDate,
        pickupSlotId,
        pickupSlotTime,
        addItem,
        removeItem,
        updateQuantity,
        setPickup,
        clearCart,
        subtotalCents,
        messageFeeCents,
        totalCents,
        totalItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
