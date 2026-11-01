"use client";

import {
  adminCacheKey,
  fetchJsonCached,
  peekCache,
  writeCache,
} from "@/lib/cachedFetch";

/**
 * One warm-up plan per admin tab. The sidebar calls `prefetchAdminRoute()` on
 * hover / focus / pointerdown and once, idle, after the panel mounts — so by
 * the time the click happens the exact payload the page needs is already in
 * memory and the tab paints on the very first render.
 */

export type AdminRouteData = {
  tables?: unknown;
  me?: unknown;
  orders?: unknown;
  payments?: unknown;
  menuItems?: unknown;
  categories?: unknown;
  serviceRequests?: unknown;
  restaurant?: unknown;
};

export const ADMIN_ROUTE_ENDPOINTS: Record<string, string[]> = {
  "/admin/dashboard": ["/api/admin/orders?view=dashboard", "/api/admin/me"],
  "/admin/orders": ["/api/admin/orders"],
  "/admin/bill": ["/api/admin/tables", "/api/admin/me"],
  "/admin/payments": [
    "/api/admin/bills?page=1&limit=10&search=&paymentMethod=all",
    "/api/admin/me",
  ],
  "/admin/menu": ["/api/admin/menu-items", "/api/admin/categories"],
  "/admin/tables": ["/api/admin/tables"],
  "/admin/qr-menu": ["/api/admin/tables", "/api/admin/me"],
  "/admin/customers": ["/api/admin/customers?page=1&limit=10&search="],
  "/admin/offers": ["/api/admin/me", "/api/admin/restaurant"],
  "/admin/analytics": ["/api/admin/orders", "/api/admin/me"],
  "/admin/staff": ["/api/admin/staff", "/api/admin/me"],
  "/admin/profile": ["/api/admin/restaurant", "/api/admin/me"],
  "/admin/settings": ["/api/admin/me"],
};

const inFlightRoutes = new Set<string>();

export function prefetchAdminRoute(href: string) {
  const endpoints = ADMIN_ROUTE_ENDPOINTS[href];
  if (!endpoints || inFlightRoutes.has(href)) return;
  inFlightRoutes.add(href);
  Promise.all(
    endpoints.map((url) => {
      const key = adminCacheKey(url);
      const cached = peekCache(key, 10_000);
      if (cached) return Promise.resolve(cached);
      return fetchJsonCached(key, url).catch(() => null);
    }),
  ).finally(() => {
    setTimeout(() => inFlightRoutes.delete(href), 2500);
  });
}

/** Warm every tab in the background, one route at a time, while the panel idles. */
export function prefetchAllAdminRoutes(hrefs: string[]) {
  if (typeof window === "undefined") return;
  let cancelled = false;
  const run = () => {
    if (!cancelled) hrefs.forEach(prefetchAdminRoute);
  };
  const idle = (
    window as unknown as {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
    }
  ).requestIdleCallback;
  if (idle) idle(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
  return () => {
    cancelled = true;
  };
}

/** Read the warm snapshot for a route without touching the network. */
export function readAdminRouteData(href: string): AdminRouteData {
  const endpoints = ADMIN_ROUTE_ENDPOINTS[href] ?? [];
  const out: AdminRouteData = {};
  for (const url of endpoints) {
    const data = peekCache(adminCacheKey(url));
    if (data === null) continue;
    if (url.startsWith("/api/admin/tables")) out.tables = data;
    else if (url.startsWith("/api/admin/me")) out.me = data;
    else if (url.startsWith("/api/admin/orders")) out.orders = data;
    else if (url.startsWith("/api/admin/bills")) out.payments = data;
    else if (url.startsWith("/api/admin/menu-items")) out.menuItems = data;
    else if (url.startsWith("/api/admin/categories")) out.categories = data;
    else if (url.startsWith("/api/admin/notifications"))
      out.serviceRequests = data;
    else if (url.startsWith("/api/admin/restaurant")) out.restaurant = data;
  }
  return out;
}

/** Store a snapshot for a route endpoint (used by pages after a refresh or mutation). */
export function saveAdminRouteData(url: string, data: unknown) {
  writeCache(adminCacheKey(url), data);
}
