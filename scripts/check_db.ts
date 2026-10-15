import { db } from "../src/lib/db";

async function main() {
  const restaurants = await db.restaurant.findMany({
    include: {
      users: { select: { email: true, role: true } },
      _count: { select: { menuItems: true, categories: true, tables: true } },
    },
  });
  console.log("RESTAURANTS:", JSON.stringify(restaurants, null, 2));

  const users = await db.user.findMany({
    select: { id: true, email: true, role: true, restaurantId: true },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
