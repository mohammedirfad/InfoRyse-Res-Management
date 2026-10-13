import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CART_TTL_MS,
  ORDERS_TTL_MS,
  getStoredOrders,
  saveStoredOrders,
  clearStoredOrders,
  type StoredPastOrder,
} from "@/components/CartContext";

// Simple localStorage mock for node test environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

describe("Cart and Confirmed Orders Lifecycle & Expiration", () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {});
  });

  it("stores confirmed orders with session id and timestamp", () => {
    const qrToken = "qr-test-token-123";
    const orders: StoredPastOrder[] = [
      {
        id: "ord-1",
        orderNumber: 1,
        status: "NEW",
        totalCents: 50000,
        createdAt: new Date().toISOString(),
        items: [{ nameSnapshot: "Pizza", priceCentsSnapshot: 50000, quantity: 1 }],
      },
    ];

    saveStoredOrders(qrToken, orders, "session-abc");
    const retrieved = getStoredOrders(qrToken, "session-abc");

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].orderNumber).toBe(1);
  });

  it("automatically wipes confirmed orders when session changes (bill paid / new sitting)", () => {
    const qrToken = "qr-test-token-123";
    const orders: StoredPastOrder[] = [
      {
        id: "ord-1",
        orderNumber: 1,
        status: "COMPLETED",
        totalCents: 35000,
        createdAt: new Date().toISOString(),
        items: [{ nameSnapshot: "Pasta", priceCentsSnapshot: 35000, quantity: 1 }],
      },
    ];

    // Saved under TableSession 1
    saveStoredOrders(qrToken, orders, "session-1");

    // Later, TableSession 2 starts (previous bill paid, new guests arrived)
    const retrieved = getStoredOrders(qrToken, "session-2");

    // Must be completely wiped so new guests never see the previous bill
    expect(retrieved).toHaveLength(0);
    expect(localStorageMock.getItem(`inforyse_orders_${qrToken}`)).toBeNull();
  });

  it("automatically expires confirmed orders after TTL (2.5 hours)", () => {
    const qrToken = "qr-test-token-ttl";
    const orders: StoredPastOrder[] = [
      {
        id: "ord-old",
        orderNumber: 5,
        status: "COMPLETED",
        totalCents: 20000,
        createdAt: new Date(Date.now() - (ORDERS_TTL_MS + 10_000)).toISOString(),
        items: [{ nameSnapshot: "Coffee", priceCentsSnapshot: 20000, quantity: 1 }],
      },
    ];

    // Mock saved with old timestamp
    const payload = {
      orders,
      updatedAt: Date.now() - (ORDERS_TTL_MS + 10_000),
      sessionId: "session-old",
    };
    localStorageMock.setItem(`inforyse_orders_${qrToken}`, JSON.stringify(payload));

    const retrieved = getStoredOrders(qrToken, "session-old");
    expect(retrieved).toHaveLength(0);
  });

  it("manual clearStoredOrders immediately wipes order history", () => {
    const qrToken = "qr-test-token-manual";
    saveStoredOrders(qrToken, [
      {
        id: "ord-test",
        orderNumber: 2,
        status: "NEW",
        totalCents: 10000,
        createdAt: new Date().toISOString(),
        items: [],
      },
    ]);

    expect(getStoredOrders(qrToken)).toHaveLength(1);
    clearStoredOrders(qrToken);
    expect(getStoredOrders(qrToken)).toHaveLength(0);
  });
});
