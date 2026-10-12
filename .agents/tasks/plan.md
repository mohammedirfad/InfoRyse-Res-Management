# Implementation Plan — InfoRyse 10-Task Feature Batch

## Codebase Facts (from exploration)

- **Stack**: Next.js 14 App Router, TypeScript, Prisma 5.18.0 + PostgreSQL (Supabase), Tailwind CSS, `framer-motion` already installed.
- **Build**: `npm run build` / `npm run dev`. Lint: `npm run lint`. Tests: `npm test` (vitest).
- **Prisma CLI**: The devDependency is `prisma@^8.0.0-rc.22` but the client is `@prisma/client@5.18.0`. Always invoke prisma via `npx --yes prisma@5.18.0 <cmd>` to avoid version mismatch.
- **`src/lib/utils.ts`**: has `cn`, `formatRupees`, `formatDate`, `formatTime` — no `formatOrderId` yet.
- **`src/lib/tenant.ts`**: `requireRestaurantUser()` returns `{ userId, restaurantId, role }` — use this in every new admin API route.
- **`CartContext.tsx`**: `clear()` already calls `localStorage.removeItem(storageKey)` where `storageKey = inforyse_cart_${restaurantSlug}_${qrToken}`. No gap — cart IS cleared on order.
- **`checkout/page.tsx`**: `clear()` is already called after successful order placement. Cart clear is working; the bug is in localStorage key for the orders list, not the cart.
- **`confirmation/page.tsx`**: Has **two** `useEffect` polling loops — one is redundant and they fight each other. The second one (starting at line ~67) is the one that actually drives `setStatus`. The first one sets `isPolling` but never updates status properly. This causes the displayed step to lag.
- **Prisma schema**: `Restaurant` has no `taxName`/`taxPercent` fields — migration required before any code uses them. `CANCELLED` is already a valid `OrderStatus` enum value.
- **`/api/admin/orders`**: fetches `take: 200` with full `include: { items, table, statusHistory }` on every poll — this is the slow query. No database indices beyond what schema.prisma defines.
- **`AdminSidebar.tsx`**: pure Server-safe client component accepting `restaurant` prop. Layout `admin/(panel)/layout.tsx` is a **Server Component** — it must become a Client Component to manage `sidebarOpen` state.
- **`settings/page.tsx`**: General Settings tab has UI fields but no API calls — they're purely decorative today. Tax config needs to be wired up for real.
- **`/api/admin/me`**: returns full `restaurant` row but no `taxName`/`taxPercent` yet (fields don't exist).
- **Public menu API** (`/api/public/menu/[slug]/[qrToken]/route.ts`): returns `{ restaurant, table, categories }` — no tax fields.
- **Public orders cancel route**: does not exist yet (`/api/public/orders/[orderNumber]/cancel` needs to be created).
- **`src/app/layout.tsx`**: No font set — just `antialiased`. Inter from `next/font/google` can be added here.
- **`package.json`**: `framer-motion 11.3.21` already present — can use for animations without adding deps.

---

## Dependency Ordering

- **Item 1** (Prisma migration) must complete before Items 5b, 5c, 5d, 5e (all tax-reading code).
- **Item 2** (formatOrderId utility) must complete before Items 3, 4, 9 (all order ID display changes).
- **Item 5a** (migration) is identical to Item 1 — combined into one migration step.
- Everything else is independent of each other.

---

## Risk Flags

1. **Prisma version skew**: `devDependencies` has `prisma@^8.0.0-rc.22` but client is `5.18.0`. Always use `npx --yes prisma@5.18.0` to avoid invoking the rc version.
2. **Layout Server→Client conversion** (Item 6): `admin/(panel)/layout.tsx` is currently a server component that calls `getSession()` and `db.restaurant.findUnique`. Converting it to `"use client"` would lose those server-side capabilities. Solution: keep layout as Server Component, convert only the wrapper `div` into a new `AdminShell` client component that holds `sidebarOpen` state and receives `children` + `restaurant` as props.
3. **Double polling loop** in `confirmation/page.tsx`: The fix in Item 8 removes the first (broken) `useEffect` entirely, keeping only the second one. Verify the `isPolling` indicator still works after removal.
4. **Tax in checkout**: `checkout/page.tsx` currently has `const TAX_RATE = 0.05` hardcoded. After Item 5, it must read `taxPercent` from the menu API response. The menu API response shape changes — update the TypeScript type `MenuData` in `page.tsx` (the customer menu page) at the same time.

---

- [ ] 1. **Add `formatOrderId` utility to `src/lib/utils.ts`**

  Derive initials from restaurant name (take first letter of each word, max 3 chars, uppercase). Zero-pad `orderNumber` to 4 digits. E.g. `formatOrderId("Riverside Café", 10)` → `"RCA0010"`. Export `formatOrderId(restaurantName: string, orderNumber: number): string`.

  Files: `src/lib/utils.ts`

  Verify: `npm run lint` passes with no new errors. Optionally: `npm test` — no existing unit tests will break.

---

- [ ] 2. **Prisma migration — add `taxName` and `taxPercent` to `Restaurant`**

  Add to the `Restaurant` model in `prisma/schema.prisma`:
  ```
  taxName    String?  @default("GST")
  taxPercent Float?   @default(5.0)
  ```
  Then run:
  ```
  npx --yes prisma@5.18.0 migrate dev --name add_tax_settings
  npx --yes prisma@5.18.0 generate
  ```
  This must happen **before** any code that references `restaurant.taxName` or `restaurant.taxPercent`.

  Files: `prisma/schema.prisma`

  Verify: Migration completes with no errors. `npx --yes prisma@5.18.0 studio` (or check Supabase dashboard) shows the new columns on the `Restaurant` table.

---

- [ ] 3. **Create the customer order-cancel API route**

  Create `src/app/api/public/orders/[orderNumber]/cancel/route.ts`.

  Logic:
  - Accept `POST` with body `{ slug: string, qrToken: string }`.
  - Validate both fields present.
  - Look up `restaurant` by `slug`. Look up `table` by `{ qrToken, restaurantId }`.
  - Look up `order` by `{ restaurantId, orderNumber: Number(params.orderNumber) }`.
  - Verify `order.tableId === table.id` (prevents cross-table cancellation).
  - Check `order.status` is `"NEW"` or `"ACCEPTED"` — return `409` otherwise with message `"Order cannot be cancelled at this stage"`.
  - Update status to `"CANCELLED"`, append to `OrderStatusHistory`.
  - Return `200 { success: true }`.
  - Use Zod for body validation. Follow the same error-wrapping pattern as `src/app/api/public/orders/route.ts`.

  Files: `src/app/api/public/orders/[orderNumber]/cancel/route.ts`

  Verify: `npm run build` succeeds. Manual test with `curl` or browser DevTools: POST to `/api/public/orders/1/cancel` with valid `{ slug, qrToken }` returns 200; with invalid status order returns 409.

---

- [ ] 4. **Update `confirmation/page.tsx` — fix polling, add cancel button, add "Order More" UX**

  This item fixes three bugs and adds two features in the same file.

  **4a — Fix the double polling loop (Bug fix)**

  The file currently has TWO `useEffect` hooks that both poll (lines ~52–65 and ~67–84). Remove the first one entirely (the one that sets `isPolling` but does a redundant `fetchOrderStatus` call that doesn't update `status`). Keep only the second `useEffect` (the one with `stopped` flag and `setStatus(s => ...)` functional updater). Add `setIsPolling(true)` before the fetch and `setIsPolling(false)` after in the kept loop, so the spinner still works.

  **4b — Add Cancel Order button**

  Below the status tracker card, add a Cancel Order button that:
  - Only renders when `status === "NEW" || status === "ACCEPTED"`.
  - Shows a `window.confirm("Are you sure you want to cancel this order?")` dialog.
  - On confirm: calls `POST /api/public/orders/${orderNumber}/cancel` with `{ slug: params.slug, qrToken: params.qrToken }`.
  - Shows a loading spinner on the button while the request is in flight (`cancellingOrder` state).
  - On success: sets `status` to `"CANCELLED"`, clears the localStorage orders key `inforyse_orders_${params.qrToken}` (removes that specific order from the array, not the whole key), shows a toast/banner "Your order has been cancelled."
  - On failure: shows error message below button.

  Styling: `border-2 border-red-200 text-red-600 rounded-2xl py-3` — consistent with the "Reject" button style in the admin panel.

  **4c — Add "Order More Items" button and 30s idle nudge**

  Replace the existing `Back to Menu` link with a more prominent `Order More Items →` button linking to `/r/${params.slug}/${params.qrToken}`. Keep `View Orders →` as-is.

  Add a 30-second idle timer (`useEffect` with `setTimeout(30000)`): after 30s of mounting (no user interaction), show a fade-in bottom banner: `"Want to order more? Browse the menu →"` linking to the menu. Banner dismisses on click. Use `opacity-0 → opacity-100 transition-opacity duration-700` for the fade.

  **4d — Use `formatOrderId` for display**

  Import `formatOrderId` from `@/lib/utils`. Replace `#{orderNumber}` display with `#{formatOrderId(restaurantName, Number(orderNumber))}`. The `restaurantName` isn't in props — read it from a `useSearchParams` `name` param already on the page, or add `restaurantName` as an additional search param from checkout. Check checkout — it passes `name` (customer name), not restaurant name. Simplest fix: pass `restaurant` as a new query param from checkout, OR derive initials from `params.slug` (e.g. slug `riverside-cafe` → `RC`). Use the slug-based derivation to avoid changing the checkout URL. Update `formatOrderId` to also accept a slug string as overload, or add a second utility `formatOrderIdFromSlug(slug: string, orderNumber: number): string`.

  Files: `src/app/r/[slug]/[qrToken]/confirmation/page.tsx`, `src/lib/utils.ts` (if adding slug variant)

  Verify: `npm run build`. Navigate to a confirmation page — only one network request to `/api/public/order-status` fires every ~5–12s (not two overlapping). Cancel button appears for NEW orders. After cancellation, status shows CANCELLED, localStorage orders entry is removed.

---

- [ ] 5. **Update order ID display in admin orders page and cart page**

  Apply `formatOrderId`/`formatOrderIdFromSlug` to all order number display sites.

  **5a — `src/app/admin/(panel)/orders/page.tsx`**

  The admin has the restaurant name available via `selected?.table` data but not a top-level `restaurantName`. The safest approach: fetch `restaurantName` from `/api/admin/me` on mount (dashboard already does this pattern). Store in `useState<string>`. In the order list cards, replace `#{o.orderNumber}` with `#{formatOrderId(restaurantName, o.orderNumber)}`. In the side panel header, same replacement. The `restaurantName` state starts as `""` — display `#${o.orderNumber}` as fallback until loaded.

  **5b — `src/app/r/[slug]/[qrToken]/cart/page.tsx`**

  In the "Confirmed orders" tab, replace `Order #{o.orderNumber}` with `Order #{formatOrderIdFromSlug(params.slug, o.orderNumber)}`.

  Files: `src/app/admin/(panel)/orders/page.tsx`, `src/app/r/[slug]/[qrToken]/cart/page.tsx`

  Verify: `npm run build`. Admin orders page shows `#RCA0010`-style IDs. Cart confirmed orders tab shows the same format.

---

- [ ] 6. **Orders page UI redesign with pagination and skeleton loaders**

  Rewrite `src/app/admin/(panel)/orders/page.tsx`. Keep ALL existing state and functions (load, updateStatus, printBill, manualOrder, etc.) — only change the JSX structure.

  **Skeleton loaders**: When `loading === true`, render 5 skeleton cards instead of the spinner. Each skeleton: `h-20 rounded-2xl bg-gray-100 animate-pulse`. Replace the current `{loading && <div className="flex justify-center...">}` block.

  **Colour-coded left border**: Each order card gets a `border-l-4` with colour by status:
  - NEW → `border-l-red-500`
  - ACCEPTED → `border-l-amber-500`
  - PREPARING → `border-l-blue-500`
  - READY → `border-l-purple-500`
  - COMPLETED → `border-l-green-500`
  - CANCELLED → `border-l-gray-300`

  **Pagination**: Add `page` state (starts at 1) and `PAGE_SIZE = 20`. After filtering, slice `filtered` into `pagedOrders = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)`. Render `pagedOrders` in the list. At the bottom of the list div, render Prev/Next buttons and a `Page X of Y` indicator. Reset `page` to 1 when `tab` or `search` changes (add `useEffect([tab, search], () => setPage(1))`).

  **Typography/spacing improvements**: Increase card padding from `p-4` to `p-4 lg:p-5`. Order number text: `text-base font-bold`. Status badges: keep existing colours. Add `font-inter` class to the page wrapper (relies on Item 10's Inter font setup — if Item 10 is run first this is free; if not, it degrades gracefully).

  **NEW order pulse badge**: already present (`animate-bounce`) — keep as-is.

  Files: `src/app/admin/(panel)/orders/page.tsx`

  Verify: `npm run build`. Orders page loads with skeleton cards. After data loads, orders show colour-coded left borders. With >20 orders: pagination controls appear and prev/next work.

---

- [ ] 7. **Menu Management page UI redesign with pagination and skeleton loaders**

  Rewrite `src/app/admin/(panel)/menu/page.tsx`. Keep all existing logic.

  **Skeleton loaders**: Add a `loading` state (default `true`, set `false` after `load()` resolves). While `loading`, show a grid of 8 skeleton cards: `h-48 rounded-2xl bg-gray-100 animate-pulse` in the same `grid-cols-2 xl:grid-cols-3` grid.

  **Pagination**: Add `page` state and `PAGE_SIZE = 12`. Slice `filtered` into `pagedItems`. Add Prev/Next + page indicator at the bottom of the items grid. Reset page to 1 when `activeFilter` or `search` changes.

  **Improved item cards (grid mode)**:
  - Item name: change from `text-sm font-semibold` to `text-base font-bold`.
  - Description: add `{item.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>}` below the name.
  - Card: increase shadow to `shadow-sm hover:shadow-lg`.

  **Category chips**: Replace the existing button style with an underline-active variant: active chip gets `border-b-2 border-[#132A1E] text-[#132A1E] font-bold bg-transparent` instead of the filled `bg-[#132A1E] text-white` pill. This is a more refined nav tab look.

  Files: `src/app/admin/(panel)/menu/page.tsx`

  Verify: `npm run build`. Menu page shows skeleton on first load. After load, cards show description text. With >12 items: pagination works. Category chips show underline style.

---

- [ ] 8. **Tax settings — Settings page + new PATCH API + update `/api/admin/me`**

  **Depends on**: Item 2 (Prisma migration).

  **8a — Update `/api/admin/me`**

  In `src/app/api/admin/me/route.ts`, change `db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } })` to add `select: { id: true, name: true, slug: true, openNow: true, taxName: true, taxPercent: true }` (explicit select prevents accidentally exposing new sensitive fields if schema grows). Remove the implicit full-row return.

  **8b — Create `/api/admin/restaurant` PATCH route**

  Create `src/app/api/admin/restaurant/route.ts` with a `PATCH` handler:
  - Call `requireRestaurantUser()`.
  - Accept body `{ taxName?: string, taxPercent?: number }` validated with Zod (taxPercent min 0 max 50).
  - `db.restaurant.update({ where: { id: restaurantId }, data: { taxName, taxPercent } })`.
  - Return `{ success: true, restaurant: updated }`.

  **8c — Tax Configuration UI in Settings page**

  In `src/app/admin/(panel)/settings/page.tsx`, the General Settings tab (`tab === "general"`) currently has no real API wiring. Add:
  - `useEffect` on mount: fetch `/api/admin/me`, populate `taxName` and `taxPercent` state.
  - Add two new `useState` hooks: `taxName: string` (default `"GST"`) and `taxPercent: string` (default `"5"`).
  - In the general settings card, below the existing grid, add a new section titled "Tax Configuration":
    ```
    <div className="border-t border-black/5 pt-4 mt-2">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Tax Configuration</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Tax Name (e.g. GST, VAT)</label>
          <input value={taxName} onChange={...} />
        </div>
        <div>
          <label>Tax Percentage (0–30%)</label>
          <input type="number" min="0" max="30" step="0.5" value={taxPercent} onChange={...} />
        </div>
      </div>
      <button onClick={saveTax}>Save Tax Settings</button>
    </div>
    ```
  - `saveTax` function: calls `PATCH /api/admin/restaurant` with `{ taxName, taxPercent: Number(taxPercent) }`. Show inline success/error message. Button shows spinner while saving (`savingTax` state).

  Files: `src/app/api/admin/me/route.ts`, `src/app/api/admin/restaurant/route.ts` (new), `src/app/admin/(panel)/settings/page.tsx`

  Verify: `npm run build`. Settings page → General tab shows tax fields pre-populated from DB. Changing values and clicking Save calls the API and returns 200.

---

- [ ] 9. **Apply dynamic tax to public menu API, checkout, and cart**

  **Depends on**: Item 2 (Prisma migration) and Item 8a (me route update).

  **9a — Public menu API**

  In `src/app/api/public/menu/[slug]/[qrToken]/route.ts`, update the `db.restaurant.findUnique` select to include `taxName: true, taxPercent: true`. Add these to the JSON response: `restaurant: { name, openNow, taxName, taxPercent }`.

  **9b — Customer menu page type**

  In `src/app/r/[slug]/[qrToken]/page.tsx`, update the `MenuData` type: `restaurant: { name: string; openNow: boolean; taxName?: string | null; taxPercent?: number | null }`. No behaviour change needed here — the landing page doesn't show tax.

  **9c — Checkout page**

  In `src/app/r/[slug]/[qrToken]/checkout/page.tsx`:
  - Add state: `taxName` and `taxRate` (Float, default 0.05).
  - On mount: fetch `/api/public/menu/${params.slug}/${params.qrToken}`, read `restaurant.taxPercent` (divide by 100 to get rate) and `restaurant.taxName`. Use as `taxRate` and `taxName`.
  - Replace `const TAX_RATE = 0.05` with the dynamic `taxRate`.
  - Replace the hardcoded `"Taxes (5%)"` label with `` `${taxName ?? "Tax"} (${((taxRate)*100).toFixed(1)}%)` ``.
  - While the tax is loading (before fetch resolves), default to 5% so the UI isn't blank.

  **9d — Cart page**

  Same change in `src/app/r/[slug]/[qrToken]/cart/page.tsx`: fetch menu API on mount (already fetches nothing currently), read tax fields, replace `TAX_RATE` and the `"Taxes (5%)"` label. Use `useEffect` + `useState` for `taxRate`/`taxName`. Default to 5% while loading.

  **9e — Admin print bill**

  In `src/app/admin/(panel)/orders/page.tsx`, update `printBill`:
  - Add a `restaurantTax` state: `{ taxName: string; taxPercent: number }` fetched from `/api/admin/me` on mount (already fetching `restaurantName` from `/api/admin/me` per Item 5a — combine into one fetch).
  - In the `printBill` function, replace `"Taxes (5%)"` with `` `${restaurantTax.taxName} (${restaurantTax.taxPercent}%)` `` and use `restaurantTax.taxPercent / 100` instead of `TAX_RATE`.
  - Remove the `const TAX_RATE = 0.05` constant.

  Files: `src/app/api/public/menu/[slug]/[qrToken]/route.ts`, `src/app/r/[slug]/[qrToken]/page.tsx`, `src/app/r/[slug]/[qrToken]/checkout/page.tsx`, `src/app/r/[slug]/[qrToken]/cart/page.tsx`, `src/app/admin/(panel)/orders/page.tsx`

  Verify: `npm run build`. Customer checkout page shows correct tax name and percentage from DB. Admin print bill uses the DB tax. Changing tax in settings reflects on next page load.

---

- [ ] 10. **Admin panel responsive layout — hamburger menu + mobile-first admin**

  **10a — Convert layout to `AdminShell` pattern**

  The current `src/app/admin/(panel)/layout.tsx` is a Server Component that calls `getSession()` and `db.restaurant.findUnique`. It cannot be made `"use client"`. Solution: extract a new `AdminShell` client component.

  Create `src/components/AdminShell.tsx` as `"use client"`:
  ```tsx
  "use client";
  import { useState } from "react";
  import AdminSidebar from "./AdminSidebar";

  export default function AdminShell({
    restaurant, children
  }: {
    restaurant: { name: string; openNow: boolean; slug: string } | null;
    children: React.ReactNode;
  }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
      <div className="min-h-screen flex bg-gray-50">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
        <AdminSidebar
          restaurant={restaurant}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile header with hamburger */}
          <div className="md:hidden sticky top-0 z-10 bg-white border-b border-black/5 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100">
              <span className="block w-5 h-0.5 bg-gray-700 mb-1"></span>
              <span className="block w-5 h-0.5 bg-gray-700 mb-1"></span>
              <span className="block w-5 h-0.5 bg-gray-700"></span>
            </button>
            <span className="font-semibold text-gray-900 text-sm">InfoRyse Admin</span>
          </div>
          {children}
        </main>
      </div>
    );
  }
  ```

  Update `src/app/admin/(panel)/layout.tsx` to use `<AdminShell>` instead of the inline div.

  **10b — Update `AdminSidebar` to accept `sidebarOpen` + `onClose` props**

  Update `src/components/AdminSidebar.tsx`:
  - Add props: `sidebarOpen: boolean`, `onClose: () => void`.
  - Change the `<aside>` className: on desktop (`md:`) always visible (`md:relative md:translate-x-0`). On mobile: `fixed inset-y-0 left-0 z-30 transition-transform duration-300` — `translate-x-0` when `sidebarOpen`, `-translate-x-full` when not.
  - Add a close button (X icon) inside the sidebar header, visible only on mobile (`md:hidden`), that calls `onClose()`.

  **10c — Mobile bottom sheet for detail panels**

  In `src/app/admin/(panel)/orders/page.tsx`, when the detail side panel is open AND viewport is mobile, render it as a fixed bottom sheet instead of a right sidebar. Use a CSS media query approach: wrap the panel with `<div className="fixed inset-x-0 bottom-0 z-40 md:relative md:w-96 md:border-l ...">`. On mobile, the panel gets `rounded-t-3xl max-h-[85vh] overflow-y-auto`. Add the same treatment to `src/app/admin/(panel)/menu/page.tsx` edit panel.

  **10d — Overflow and table fixes**

  In `src/app/admin/(panel)/orders/page.tsx`: add `overflow-x-hidden` to the main list container. On mobile, hide the `orderType` and `paymentMethod` columns from the detail grid. For the order cards, the existing layout is already flex-wrap safe.

  Files: `src/components/AdminShell.tsx` (new), `src/components/AdminSidebar.tsx`, `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/orders/page.tsx`, `src/app/admin/(panel)/menu/page.tsx`

  Verify: `npm run build`. At 375px viewport, sidebar is hidden by default, hamburger opens it as an overlay. Order detail panel shows as bottom sheet. No horizontal overflow visible.

---

- [ ] 11. **Dashboard skeleton loaders + Inter font + `clientCache.ts`**

  **11a — Inter font**

  In `src/app/layout.tsx`, import `Inter` from `next/font/google`. Apply `inter.variable` to the `<html>` and `inter.className` to the `<body>`. This makes Inter available to all pages as the default sans-serif.

  ```tsx
  import { Inter } from "next/font/google";
  const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
  // html: className={inter.variable}
  // body: className={cn(inter.className, "min-h-screen bg-white text-gray-900 antialiased")}
  ```

  Import `cn` from `@/lib/utils`.

  **11b — `SkeletonCard` component**

  Create `src/components/SkeletonCard.tsx`:
  ```tsx
  export default function SkeletonCard({ className = "" }: { className?: string }) {
    return (
      <div className={`rounded-2xl bg-gray-100 animate-pulse ${className}`} />
    );
  }
  ```

  **11c — Dashboard skeleton loaders**

  In `src/app/admin/(panel)/dashboard/page.tsx`:
  - Add `loading` state (default `true`, set `false` after both fetches resolve).
  - While loading: show 4 `<SkeletonCard className="h-28" />` in the KPI grid, and `<SkeletonCard className="h-56" />` in the chart area. Import `SkeletonCard` from `@/components/SkeletonCard`.
  - Combine the two existing `fetch` calls into a single `Promise.all` pattern (already separated — merge them) so both resolve together and `loading` becomes `false` at once.

  **11d — `clientCache.ts`**

  Create `src/lib/clientCache.ts`:
  ```ts
  type CacheEntry<T> = { data: T; timestamp: number };
  const cache = new Map<string, CacheEntry<unknown>>();

  export function getCached<T>(key: string, maxAgeMs = 30_000): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAgeMs) { cache.delete(key); return null; }
    return entry.data;
  }

  export function setCached<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
  }

  export function invalidateCache(key: string): void {
    cache.delete(key);
  }
  ```

  **11e — Use `clientCache` in dashboard**

  In `dashboard/page.tsx`, wrap the `/api/admin/orders` and `/api/admin/me` fetches:
  ```ts
  const cached = getCached<Order[]>("dashboard:orders");
  if (cached) { setOrders(cached); setLoading(false); }
  // then fetch, and after: setCached("dashboard:orders", data.orders)
  ```
  Menu page (`/api/admin/menu-items`) can also be wrapped the same way in `menu/page.tsx`.

  Files: `src/app/layout.tsx`, `src/components/SkeletonCard.tsx` (new), `src/app/admin/(panel)/dashboard/page.tsx`, `src/lib/clientCache.ts` (new), `src/app/admin/(panel)/menu/page.tsx`

  Verify: `npm run build`. Dashboard shows skeleton cards on first load. Navigating away and back restores data instantly from cache (no spinner on second visit within 30s).

---

- [ ] 12. **Image storage recommendation document**

  Create `IMAGES.md` at project root `c:\Users\Quantum\Desktop\Resturant infosy\inforyse-app\IMAGES.md`.

  Content must cover:
  - Primary recommendation: **Cloudflare R2** — 10GB free, zero egress fees, S3-compatible API, global CDN via Cloudflare network. Best for a growing SaaS product.
  - Alternative 1: **Supabase Storage** — 1GB free, already in the stack (same project, simple setup). Best for quick start.
  - Alternative 2: **Bunny CDN Storage** — cheapest for India-region CDN delivery (~$0.01/GB storage + $0.01/GB egress).
  - Implementation guide: presigned-URL upload flow (client → `/api/admin/upload-url` → R2 presigned URL → direct browser upload → store public URL in `imageUrl` field).
  - Code example for `src/app/api/admin/upload-url/route.ts` using the `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3-compatible).
  - Hard rule: never store images as base64 in PostgreSQL — this will bloat the DB and slow all queries.

  Files: `IMAGES.md` (project root)

  Verify: File exists at the correct path. `npm run build` still succeeds (doc file doesn't affect build).

---

- [ ] 13. **Cart clear after order placed — verify and belt-and-suspenders fix**

  The `CartContext.clear()` already calls `localStorage.removeItem(storageKey)`. The checkout page already calls `clear()` after successful order. No bug in the primary flow — the task requires a "belt-and-suspenders" redundant clear.

  In `src/app/r/[slug]/[qrToken]/checkout/page.tsx`, after `clear()` on successful order, add an explicit redundant clear:
  ```ts
  clear();
  // Belt-and-suspenders: clear the cart key directly in case CartContext storageKey diverges
  localStorage.removeItem(`inforyse_cart_${params.slug}_${params.qrToken}`);
  ```

  No change needed to `CartContext.tsx` — `clear()` is already correct.

  Files: `src/app/r/[slug]/[qrToken]/checkout/page.tsx`

  Verify: `npm run build`. Place a test order → navigate back to menu → cart shows empty.

---

- [ ] 14. **Re-order speed — "Order More" button and Re-order on confirmed orders**

  **14a — "Order More Items" on confirmation page**

  Already covered in Item 4c — the `Order More Items →` button and 30s idle nudge are added there. No additional work needed here beyond what Item 4 does.

  **14b — "Re-order" button in cart's confirmed orders tab**

  In `src/app/r/[slug]/[qrToken]/cart/page.tsx`, in the confirmed orders tab, add a "Re-order" button next to each past order:

  ```tsx
  import { useCart } from "@/components/CartContext";
  // ... inside component:
  const { addItem } = useCart();

  function reorder(order: PastOrder) {
    order.items.forEach(i => {
      addItem({
        id:          i.menuItemId ?? crypto.randomUUID(), // fallback for old entries without id
        name:        i.nameSnapshot,
        description: null,
        priceCents:  i.priceCentsSnapshot,
        imageUrl:    null,
        isVeg:       true,  // unknown from snapshot — safe default
        isAvailable: true,
      });
    });
    // Navigate to checkout immediately
    // Use router.push — import useRouter
    router.push(`/r/${params.slug}/${params.qrToken}/cart`);
  }
  ```

  Note: `PastOrder.items` currently has `{ nameSnapshot, priceCentsSnapshot, quantity }` — add `menuItemId?: string` to the `PastOrder` type. Also update the localStorage write in `checkout/page.tsx` to include `menuItemId: l.item.id` in each item so re-orders can reference the real ID. Without the real ID, `addItem` uses a UUID fallback which means each re-order line is treated as a new unique item (no deduplication) — acceptable since the re-order is one-shot.

  Style the Re-order button: `text-xs font-semibold text-[#132A1E] border border-[#132A1E] rounded-full px-3 py-1.5 hover:bg-[#132A1E]/5 active:scale-95 transition-all`.

  Place it to the right of the "Order total" row in each confirmed order card.

  Files: `src/app/r/[slug]/[qrToken]/cart/page.tsx`, `src/app/r/[slug]/[qrToken]/checkout/page.tsx`

  Verify: `npm run build`. In cart confirmed orders tab, each order shows a Re-order button. Tapping it adds items to the cart and the cart badge updates.

---

## Build Verification (run after all items complete)

```powershell
cd "c:\Users\Quantum\Desktop\Resturant infosy\inforyse-app"
npm run build
npm run lint
```

Expected: No TypeScript errors. No ESLint errors. Build output size does not grow unreasonably.

---

## Summary of New Files Created

| File | Purpose |
|---|---|
| `src/app/api/public/orders/[orderNumber]/cancel/route.ts` | Customer cancel order API |
| `src/app/api/admin/restaurant/route.ts` | Admin PATCH restaurant settings |
| `src/components/AdminShell.tsx` | Client component wrapping sidebar+main |
| `src/components/SkeletonCard.tsx` | Reusable skeleton loader |
| `src/lib/clientCache.ts` | In-memory 30s cache helper |
| `IMAGES.md` | Image storage recommendation doc |

## Summary of Modified Files

| File | What changes |
|---|---|
| `prisma/schema.prisma` | Add `taxName`, `taxPercent` to Restaurant |
| `src/lib/utils.ts` | Add `formatOrderId`, `formatOrderIdFromSlug` |
| `src/app/layout.tsx` | Add Inter font |
| `src/components/AdminSidebar.tsx` | Add `sidebarOpen`/`onClose` props, mobile overlay behaviour |
| `src/app/admin/(panel)/layout.tsx` | Use `<AdminShell>` |
| `src/app/admin/(panel)/orders/page.tsx` | Skeleton, pagination, colour borders, dynamic tax, formatOrderId, mobile sheet |
| `src/app/admin/(panel)/menu/page.tsx` | Skeleton, pagination, improved cards, mobile sheet |
| `src/app/admin/(panel)/dashboard/page.tsx` | Skeleton cards, clientCache |
| `src/app/admin/(panel)/settings/page.tsx` | Tax configuration section wired to API |
| `src/app/api/admin/me/route.ts` | Include `taxName`, `taxPercent` in select |
| `src/app/api/public/menu/[slug]/[qrToken]/route.ts` | Include tax fields in response |
| `src/app/r/[slug]/[qrToken]/page.tsx` | Update `MenuData` type for tax fields |
| `src/app/r/[slug]/[qrToken]/confirmation/page.tsx` | Fix polling, cancel button, "Order More", formatOrderId |
| `src/app/r/[slug]/[qrToken]/checkout/page.tsx` | Dynamic tax, belt-and-suspenders cart clear, store menuItemId |
| `src/app/r/[slug]/[qrToken]/cart/page.tsx` | Dynamic tax, Re-order button, formatOrderIdFromSlug |
