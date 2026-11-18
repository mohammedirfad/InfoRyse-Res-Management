import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * The admin shell is rendered during every App Router navigation. Cache its
 * small identity/tenant lookup briefly so clicks do not make a second DB
 * round-trip when the page APIs are already loading the requested screen.
 * Tenant suspension remains bounded by this short revalidation window.
 */
const getCachedAdminPanelUser = unstable_cache(
  async (userId: string) => db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      mustChangePassword: true,
      restaurant: { select: { id: true, name: true, openNow: true, slug: true, isActive: true } },
    },
  }),
  ["admin-panel-user-context-v1"],
  { revalidate: 5, tags: ["admin-panel-context"] },
);

export function getAdminPanelUser(userId: string) {
  return getCachedAdminPanelUser(userId);
}
