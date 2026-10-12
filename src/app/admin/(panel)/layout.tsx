import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.restaurantId) {
    redirect("/admin/login");
  }

  const restaurant = await db.restaurant.findUnique({ where: { id: session.restaurantId } });

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar restaurant={restaurant} />
      {/* On mobile: full width (sidebar is overlay). On desktop: sidebar takes 256px */}
      <main className="flex-1 overflow-y-auto min-w-0 lg:pl-0 pl-0">
        {/* Mobile top padding so hamburger button doesn't cover content */}
        <div className="lg:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
