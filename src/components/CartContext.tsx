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
  isBestseller?: boolean;
  isPopular?: boolean;
  isChefsPick?: boolean;
  isTodaySpecial?: boolean;
  categoryName?: string;
};

export type CartLine = { item: MenuItem; quantity: number };



// Key is per-table so cart persists even if customer closes and reopens the tab.
// This also means if the same table has two devices, each has its own cart (expected).
type StoredCartData = {
  lines: CartLine[];
  updatedAt: number;
  sessionId?: string | null;
};

// Key is per-table so cart persists during the customer's active dining session.
function tableCartKey(restaurantSlug: string, qrToken: string) {
  return `inforyse_cart_${restaurantSlug}_${qrToken}`;
}

export const CART_TTL_MS = 60 * 60 * 1000; // 60 minutes TTL (market standard for unsubmitted QR carts)
export const ORDERS_TTL_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours TTL for active dining tab

type CartContextType = {
  lines: CartLine[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, qty: number) => void;
  clear: () => void;
  totalCents: number;
  totalCount: number;
  syncSession: (activeSessionId?: string | null, tableStatus?: string) => void;
};

const CartContext = createContext<CartContextType | null>(null);

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Hydrate from localStorage with automatic TTL expiration check
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();

        // Support both modern { lines, updatedAt, sessionId } and legacy CartLine[] format
        if (Array.isArray(parsed)) {
          setLines(parsed);
        } else if (parsed && Array.isArray(parsed.lines)) {
          const isExpired = parsed.updatedAt && (now - parsed.updatedAt > CART_TTL_MS);
          if (isExpired) {
            localStorage.removeItem(storageKey);
            setLines([]);
          } else {
            setLines(parsed.lines);
            if (parsed.sessionId) setCurrentSessionId(parsed.sessionId);
          }
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
      setLines([]);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  // Persist on change with timestamp and session tracking
  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      const payload: StoredCartData = {
        lines,
        updatedAt: Date.now(),
        sessionId: currentSessionId,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  }, [lines, hydrated, storageKey, currentSessionId]);

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

  const clear = () => {
    setLines([]);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  /**
   * Called by MenuPage when fresh server metadata loads.
   * If table has been marked AVAILABLE or session has changed (bill paid),
   * wipe unplaced carts and reset stale orders so the new party starts fresh.
   */
  const syncSession = (activeSessionId?: string | null, tableStatus?: string) => {
    if (activeSessionId !== undefined) {
      setCurrentSessionId(activeSessionId ?? null);
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const isLegacy = Array.isArray(parsed);
      const cartTime = isLegacy ? 0 : (parsed?.updatedAt || 0);
      const now = Date.now();

      // If table is AVAILABLE and cart has been sitting for >15 mins, or session mismatch:
      const isStaleOnAvailable = tableStatus === "AVAILABLE" && (now - cartTime > 15 * 60 * 1000);
      const isSessionMismatch = !isLegacy && parsed?.sessionId && activeSessionId && parsed.sessionId !== activeSessionId;
      const isExpired = !isLegacy && cartTime && (now - cartTime > CART_TTL_MS);

      if (isStaleOnAvailable || isSessionMismatch || isExpired) {
        clear();
      }
    } catch {
      clear();
    }
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
      value={{ lines, addItem, removeItem, setQuantity, clear, totalCents, totalCount, syncSession }}
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

/* ── Confirmed Orders Storage & Expiration Helpers ───────────────────────── */
export type StoredPastOrder = {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  createdAt: string;
  items: { nameSnapshot: string; priceCentsSnapshot: number; quantity: number }[];
  sessionId?: string | null;
};

type StoredOrdersContainer = {
  orders: StoredPastOrder[];
  updatedAt: number;
  sessionId?: string | null;
};

export function getStoredOrders(qrToken: string, activeSessionId?: string | null): StoredPastOrder[] {
  if (typeof window === "undefined") return [];
  const key = `inforyse_orders_${qrToken}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();

    // Check container format with timestamp
    if (parsed && Array.isArray(parsed.orders)) {
      const container = parsed as StoredOrdersContainer;
      // If older than 2.5 hours, dining session has ended -> wipe
      if (now - container.updatedAt > ORDERS_TTL_MS) {
        localStorage.removeItem(key);
        return [];
      }
      // If server activeSessionId is known and different from stored session, wipe
      if (activeSessionId && container.sessionId && container.sessionId !== activeSessionId) {
        localStorage.removeItem(key);
        return [];
      }
      return container.orders;
    }

    // Support legacy array format
    if (Array.isArray(parsed)) {
      // Check oldest order timestamp if available
      const first = parsed[0];
      if (first?.createdAt && (now - new Date(first.createdAt).getTime() > ORDERS_TTL_MS)) {
        localStorage.removeItem(key);
        return [];
      }
      return parsed;
    }
  } catch {
    localStorage.removeItem(key);
  }
  return [];
}

export function saveStoredOrders(qrToken: string, orders: StoredPastOrder[], sessionId?: string | null) {
  if (typeof window === "undefined") return;
  const key = `inforyse_orders_${qrToken}`;
  if (!orders || orders.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  const payload: StoredOrdersContainer = {
    orders,
    updatedAt: Date.now(),
    sessionId: sessionId ?? null,
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch { /* ignore quota */ }
}

export function clearStoredOrders(qrToken: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`inforyse_orders_${qrToken}`);
  } catch { /* ignore */ }
}
