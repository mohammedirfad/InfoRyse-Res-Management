import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/** Menu data is shared by every table in a restaurant; table/session state is not. */
export function getPublicMenuCategories(restaurantId: string) {
  return unstable_cache(
    () => db.category.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { position: "asc" },
      include: {
        menuItems: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            imageUrl: true,
            isVeg: true,
            isAvailable: true,
          },
        },
      },
    }),
    ["public-menu-categories", restaurantId],
    { revalidate: 60, tags: [`public-menu:${restaurantId}`] }
  )();
}

export function invalidatePublicMenu(restaurantId: string) {
  revalidateTag(`public-menu:${restaurantId}`);
}
