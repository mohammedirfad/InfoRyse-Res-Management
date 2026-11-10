"use client";

import {
  adminCacheKey,
  prefetchJson,
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
  "/admin/menu": ["/api/admin/menu-items?page=1&limit=30", "/api/admin/categories"],
  "/admin/tables": ["/api/admin/tables"],
  "/admin/qr-menu": ["/api/admin/tables", "/api/admin/me"],
  "/admin/customers": ["/api/admin/customers?page=1&limit=10&search="],
  "/admin/offers": ["/api/admin/me", "/api/admin/restaurant"],
  // Analytics pulls the full order and bill history; keep that heavy query
  // scoped to the page itself instead of firing it on a sidebar hover.
  "/admin/analytics": ["/api/admin/me"],
  "/admin/staff": ["/api/admin/staff", "/api/admin/me"],
  "/admin/profile": ["/api/admin/restaurant", "/api/admin/me"],
  "/admin/settings": ["/api/admin/me"],
};

const prefetchedRoutes = new Set<string>();

/** Warm the page bundle and its small first-page API payload on link intent. */
export function prefetchAdminRoute(href: string) {
  if (prefetchedRoutes.has(href)) return;
  prefetchedRoutes.add(href);
  for (const url of ADMIN_ROUTE_ENDPOINTS[href] ?? []) {
    prefetchJson(adminCacheKey(url), url);
  }
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
