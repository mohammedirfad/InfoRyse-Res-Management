import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  // ── Super Admin ─────────────────────────────────────────────────────────────
  await db.user.upsert({
    where:  { email: "superadmin@inforyse.com" },
    update: {},
    create: { email: "superadmin@inforyse.com", passwordHash, role: "SUPER_ADMIN" },
  });

  // ── Restaurant ───────────────────────────────────────────────────────────────
  const restaurant = await db.restaurant.upsert({
    where:  { slug: "riverside-cafe" },
    update: {},
    create: { slug: "riverside-cafe", name: "Riverside Café", isActive: true, openNow: true },
  });

  await db.user.upsert({
    where:  { email: "owner@riversidecafe.com" },
    update: {},
    create: { email: "owner@riversidecafe.com", passwordHash, role: "OWNER", restaurantId: restaurant.id },
  });

  await db.user.upsert({
    where:  { email: "staff@riversidecafe.com" },
    update: {},
    create: { email: "staff@riversidecafe.com", passwordHash, role: "STAFF", restaurantId: restaurant.id },
  });

  // ── Categories ───────────────────────────────────────────────────────────────
  const catNames = ["Breakfast","Starters","Main Course","Beverages","Desserts","Snacks"];
  const cats: Record<string, { id: string }> = {};

  for (let i = 0; i < catNames.length; i++) {
    const existing = await db.category.findFirst({ where: { restaurantId: restaurant.id, name: catNames[i] } });
    if (existing) { cats[catNames[i]] = existing; continue; }
    cats[catNames[i]] = await db.category.create({
      data: { restaurantId: restaurant.id, name: catNames[i], position: i + 1 },
    });
  }

  // ── Menu Items ───────────────────────────────────────────────────────────────
  const ITEMS = [
    // Breakfast
    { name: "Masala Dosa",            desc: "Crispy rice crepe filled with spiced potato masala, served with sambar and chutney.",     price: 12000, isVeg: true,  cat: "Breakfast" },
    { name: "Idli Sambar",            desc: "Soft steamed rice cakes served with freshly prepared sambar and coconut chutney.",        price: 9000,  isVeg: true,  cat: "Breakfast" },
    { name: "Poha",                   desc: "Flattened rice cooked with onions, peas, and spices, garnished with fresh coriander.",   price: 8000,  isVeg: true,  cat: "Breakfast" },
    { name: "Pancake Stack",          desc: "Fluffy American-style pancakes with maple syrup, butter and fresh berries.",             price: 18000, isVeg: true,  cat: "Breakfast" },
    // Starters
    { name: "Paneer Tikka",           desc: "Tender cottage cheese marinated in spices, grilled in tandoor. Served with mint chutney.", price: 28000, isVeg: true,  cat: "Starters"  },
    { name: "Chicken Wings",          desc: "Crispy fried chicken wings tossed in tangy buffalo sauce. Served with dipping sauce.",   price: 32000, isVeg: false, cat: "Starters"  },
    { name: "Crispy Corn",            desc: "Golden fried sweet corn kernels seasoned with salt, pepper and chaat masala.",           price: 18000, isVeg: true,  cat: "Starters"  },
    { name: "Hara Bhara Kebab",       desc: "Pan-fried patties made with spinach, peas, and spiced potatoes. A vegetarian delight.", price: 22000, isVeg: true,  cat: "Starters"  },
    // Main Course
    { name: "Truffle Mushroom Pasta", desc: "A rich and creamy pasta made with fresh mushrooms, truffle oil, parmesan and garlic bread.", price: 32000, isVeg: true,  cat: "Main Course" },
    { name: "Paneer Butter Masala",   desc: "Velvety cottage cheese cubes in rich tomato-butter gravy with aromatic Indian spices.",  price: 28000, isVeg: true,  cat: "Main Course" },
    { name: "Chicken Biryani",        desc: "Aromatic basmati rice cooked with tender chicken, saffron and whole spices. Served with raita.", price: 38000, isVeg: false, cat: "Main Course" },
    { name: "Margherita Pizza",       desc: "Classic thin-crust pizza with tomato sauce, fresh mozzarella, and fragrant basil leaves.", price: 28000, isVeg: true,  cat: "Main Course" },
    { name: "Butter Chicken",         desc: "Succulent chicken pieces in a velvety tomato and cream sauce, a North Indian classic.", price: 34000, isVeg: false, cat: "Main Course" },
    { name: "Dal Makhani",            desc: "Slow-cooked black lentils in a rich buttery tomato sauce, simmered overnight.",          price: 24000, isVeg: true,  cat: "Main Course" },
    // Beverages
    { name: "Fresh Lime Mint",        desc: "Chilled lime juice blended with fresh mint, black salt, and a touch of sweetness.",     price: 12000, isVeg: true,  cat: "Beverages" },
    { name: "Mango Lassi",            desc: "Creamy yogurt smoothie blended with fresh Alphonso mangoes and a hint of cardamom.",    price: 14000, isVeg: true,  cat: "Beverages" },
    { name: "Cold Coffee",            desc: "Rich espresso blended with chilled milk, ice cream and chocolate sauce.",               price: 18000, isVeg: true,  cat: "Beverages" },
    { name: "Masala Chai",            desc: "Traditional Indian spiced tea brewed with ginger, cardamom, and aromatic spices.",      price: 6000,  isVeg: true,  cat: "Beverages" },
    // Desserts
    { name: "Chocolate Lava Cake",    desc: "Warm chocolate cake with a molten liquid centre, served with vanilla ice cream.",       price: 22000, isVeg: true,  cat: "Desserts"  },
    { name: "Gulab Jamun",            desc: "Soft milk-solid dumplings soaked in rose-flavored sugar syrup. Best served warm.",     price: 12000, isVeg: true,  cat: "Desserts"  },
    { name: "Mango Kulfi",            desc: "Traditional Indian ice cream made with condensed milk and fresh Alphonso mango pulp.",  price: 16000, isVeg: true,  cat: "Desserts"  },
    // Snacks
    { name: "Masala Fries",           desc: "Golden crispy fries tossed in our signature masala spice blend with a side of ketchup.", price: 16000, isVeg: true,  cat: "Snacks"    },
    { name: "Veg Cheese Sandwich",    desc: "Toasted bread stuffed with fresh veggies, processed cheese and herbed butter.",        price: 14000, isVeg: true,  cat: "Snacks"    },
    { name: "Classic Burger",         desc: "Juicy beef patty with lettuce, tomato, pickles, onion, and special burger sauce.",     price: 24000, isVeg: false, cat: "Snacks"    },
  ];

  for (const item of ITEMS) {
    const cat = cats[item.cat];
    if (!cat) continue;
    const existing = await db.menuItem.findFirst({ where: { restaurantId: restaurant.id, name: item.name } });
    if (existing) continue;
    await db.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId:   cat.id,
        name:         item.name,
        description:  item.desc,
        priceCents:   item.price,
        isVeg:        item.isVeg,
        isAvailable:  true,
      },
    });
  }

  // ── Tables ────────────────────────────────────────────────────────────────────
  const existingTables = await db.table.count({ where: { restaurantId: restaurant.id } });
  if (existingTables === 0) {
    await db.table.createMany({
      data: [
        ...Array.from({ length: 10 }, (_, i) => ({
          restaurantId: restaurant.id,
          label:        `T${i + 1}`,
          section:      "Indoor",
          capacity:     i % 3 === 0 ? 6 : 4,
          qrToken:      nanoid(21),
          status:       (i === 0 ? "OCCUPIED" : "AVAILABLE") as "OCCUPIED" | "AVAILABLE",
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          restaurantId: restaurant.id,
          label:        `O${i + 1}`,
          section:      "Outdoor",
          capacity:     4,
          qrToken:      nanoid(21),
          status:       "AVAILABLE" as const,
        })),
      ],
    });
  }

  // ── Sample orders in various statuses ────────────────────────────────────────
  const tables   = await db.table.findMany({ where: { restaurantId: restaurant.id } });
  const menuItems = await db.menuItem.findMany({ where: { restaurantId: restaurant.id } });

  const ORDER_STATUSES = ["NEW","ACCEPTED","PREPARING","READY","COMPLETED","COMPLETED","COMPLETED","CANCELLED"] as const;

  for (let i = 0; i < 8; i++) {
    const ikey = `seed-order-${i + 1}`;
    const existing = await db.order.findFirst({ where: { idempotencyKey: ikey } });
    if (existing) continue;

    const status = ORDER_STATUSES[i];
    const table  = tables[i % tables.length];
    const item1  = menuItems[i % menuItems.length];
    const item2  = menuItems[(i + 3) % menuItems.length];
    const sub    = item1.priceCents * 2 + item2.priceCents;

    const order = await db.order.create({
      data: {
        restaurantId:  restaurant.id,
        tableId:       table.id,
        orderNumber:   i + 1,
        customerName:  ["Rahul","Priya","Amit","Sneha","Vikram","Meera","Karan","Anjali"][i],
        customerPhone: `+91 9876${5 + i}43210`,
        status,
        subtotalCents: sub,
        totalCents:    sub + Math.round(sub * 0.05) + 2000,
        idempotencyKey: ikey,
        createdAt:     new Date(Date.now() - (8 - i) * 3600 * 1000),
      },
    });

    await db.orderItem.createMany({
      data: [
        { orderId: order.id, menuItemId: item1.id, nameSnapshot: item1.name, priceCentsSnapshot: item1.priceCents, quantity: 2 },
        { orderId: order.id, menuItemId: item2.id, nameSnapshot: item2.name, priceCentsSnapshot: item2.priceCents, quantity: 1 },
      ],
    });

    await db.orderStatusHistory.create({
      data: { orderId: order.id, status: "NEW", createdAt: order.createdAt },
    });

    if (["ACCEPTED","PREPARING","READY","COMPLETED"].includes(status)) {
      await db.orderStatusHistory.create({
        data: { orderId: order.id, status: "ACCEPTED", createdAt: new Date(order.createdAt.getTime() + 2 * 60 * 1000) },
      });
    }
    if (["PREPARING","READY","COMPLETED"].includes(status)) {
      await db.orderStatusHistory.create({
        data: { orderId: order.id, status: "PREPARING", createdAt: new Date(order.createdAt.getTime() + 5 * 60 * 1000) },
      });
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│  Super Admin   superadmin@inforyse.com           │");
  console.log("│  Restaurant    owner@riversidecafe.com           │");
  console.log("│  Staff         staff@riversidecafe.com           │");
  console.log("│  Password      ChangeMe123!                      │");
  console.log("│  Slug          riverside-cafe                    │");
  console.log("│  Tables        16 (10 indoor + 6 outdoor)        │");
  console.log(`│  Categories    ${catNames.length} categories                        │`);
  console.log(`│  Menu Items    ${ITEMS.length} items across all categories   │`);
  console.log("│  Orders        8 sample orders (various statuses)│");
  console.log("└─────────────────────────────────────────────────┘\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
