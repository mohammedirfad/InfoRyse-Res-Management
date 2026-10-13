import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10));
    const exportAll = url.searchParams.get("export") === "true";

    // Fetch all non-cancelled orders for this restaurant
    const orders = await db.order.findMany({
      where: {
        restaurantId,
        status: { not: "CANCELLED" },
      },
      include: {
        table: { select: { label: true } },
        items: {
          select: {
            nameSnapshot: true,
            priceCentsSnapshot: true,
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group orders by customer (phone preferred, then clean name)
    const customerMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      email: string;
      orderCount: number;
      totalSpent: number;
      lastVisit: string;
      firstVisit: string;
      tables: Set<string>;
      status: "NEW" | "REPEAT" | "VIP";
      recentOrders: Array<{
        id: string;
        orderNumber: number;
        totalCents: number;
        status: string;
        createdAt: string;
        tableLabel: string;
        items: Array<{ name: string; quantity: number; price: number }>;
      }>;
    }>();

    for (const order of orders) {
      const rawName = (order.customerName ?? "").trim();
      const rawPhone = (order.customerPhone ?? "").trim();
      const rawEmail = (order.customerEmail ?? "").trim();

      // If neither name nor phone exists, group as "Table Guest"
      const key = rawPhone
        ? `phone:${rawPhone}`
        : rawEmail
        ? `email:${rawEmail}`
        : rawName
        ? `name:${rawName.toLowerCase()}`
        : `table:${order.table?.label ?? "unknown"}`;

      const displayName = rawName || (rawPhone ? `Guest (${rawPhone.slice(-4)})` : "Table Guest");

      let existing = customerMap.get(key);
      if (!existing) {
        existing = {
          id: key,
          name: displayName,
          phone: rawPhone,
          email: rawEmail,
          orderCount: 0,
          totalSpent: 0,
          lastVisit: order.createdAt.toISOString(),
          firstVisit: order.createdAt.toISOString(),
          tables: new Set<string>(),
          status: "NEW",
          recentOrders: [],
        };
        customerMap.set(key, existing);
      }

      existing.orderCount += 1;
      existing.totalSpent += order.totalCents;
      if (order.table?.label) existing.tables.add(order.table.label);

      // Keep up to 5 recent orders per customer
      if (existing.recentOrders.length < 5) {
        existing.recentOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          totalCents: order.totalCents,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          tableLabel: order.table?.label ?? "",
          items: order.items.map((i) => ({
            name: i.nameSnapshot,
            quantity: i.quantity,
            price: i.priceCentsSnapshot,
          })),
        });
      }
    }

    // Convert map to array and compute VIP/REPEAT status
    let customers = Array.from(customerMap.values()).map((c) => {
      let status: "NEW" | "REPEAT" | "VIP" = "NEW";
      if (c.orderCount >= 5 || c.totalSpent >= 200000) {
        status = "VIP";
      } else if (c.orderCount >= 2) {
        status = "REPEAT";
      }

      return {
        ...c,
        status,
        tables: Array.from(c.tables),
      };
    });

    // Sort by last visit descending
    customers.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

    // Apply search filter if provided
    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      );
    }

    const totalCustomers = customers.length;
    const totalSpentAll = customers.reduce((s, c) => s + c.totalSpent, 0);

    // If exporting, return all data without pagination
    if (exportAll) {
      return Response.json({
        customers,
        total: totalCustomers,
        totalSpent: totalSpentAll,
      });
    }

    // Server-side pagination (10 per page default)
    const startIndex = (page - 1) * limit;
    const paginatedCustomers = customers.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(totalCustomers / limit) || 1;

    return Response.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats: {
        totalCustomers,
        totalSpent: totalSpentAll,
        newCount: customers.filter((c) => c.status === "NEW").length,
        repeatCount: customers.filter((c) => c.status === "REPEAT").length,
        vipCount: customers.filter((c) => c.status === "VIP").length,
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
