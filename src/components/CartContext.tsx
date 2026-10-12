"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  isVeg: boolean;
  isAvailable: boolean;
};

export type CartLine = { item: MenuItem; quantity: number };

type CartContextType = {
  lines: CartLine[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, qty: number) => void;
  clear: () => void;
  totalCents: number;
  totalCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

// Key is per-table so cart persists even if customer closes and reopens the tab.
// This also means if the same table has two devices, each has its own cart (expected).
function tableCartKey(restaurantSlug: string, qrToken: string) {
  return `inforyse_cart_${restaurantSlug}_${qrToken}`;
}

export function CartProvider({
  restaurantSlug,
  qrToken,
  children,
}: {
  restaurantSlug: string;
  qrToken: string;
  children: React.ReactNode;
}) {
  const storageKey = tableCartKey(restaurantSlug, qrToken);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount — cart survives page close/reopen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore corrupt localStorage
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  // Persist on every change
  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines, hydrated, storageKey]);

  const addItem = (item: MenuItem) =>
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing)
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      return [...prev, { item, quantity: 1 }];
    });

  const removeItem = (itemId: string) =>
    setLines((prev) => prev.filter((l) => l.item.id !== itemId));

  const setQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) return removeItem(itemId);
    setLines((prev) =>
      prev.map((l) => (l.item.id === itemId ? { ...l, quantity: qty } : l))
    );
  };

  // clear() is only called after successful order submission
  const clear = () => {
    setLines([]);
    localStorage.removeItem(storageKey);
  };

  const totalCents = useMemo(
    () => lines.reduce((s, l) => s + l.item.priceCents * l.quantity, 0),
    [lines]
  );
  const totalCount = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{ lines, addItem, removeItem, setQuantity, clear, totalCents, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function formatRupees(cents: number) {
  return `₹${(cents / 100).toFixed(0)}`;
}
