import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminSidebar from "@/components/AdminSidebar";
import { ForcePasswordChangeModal } from "@/components/ForcePasswordChangeModal";
import { Ban } from "lucide-react";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.restaurantId) {
    redirect("/admin/login");
  }

  const [restaurant, user] = await Promise.all([
    db.restaurant.findUnique({ where: { id: session.restaurantId } }),
    db.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!restaurant) {
    redirect("/admin/login");
  }

  // If Super Admin blocked/suspended this restaurant, deny access completely
  if (!restaurant.isActive) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-red-200">
          <div className="h-16 w-16 mx-auto bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            <Ban className="h-9 w-9" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Restaurant Access Suspended</h1>
          <p className="text-sm text-gray-600 mt-2">
            <strong>{restaurant.name}</strong> has been deactivated or blocked by Super Administration. Your operational portal and live ordering services are paused.
          </p>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2">
            <a
              href="mailto:support@inforyse.com"
              className="btn-primary bg-[#0B1736] text-white justify-center py-3 rounded-xl text-sm"
            >
              Contact Support
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 py-2">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 relative">
      <AdminSidebar restaurant={restaurant} userRole={session.role} />
      {/* On mobile: full width (sidebar is overlay). On desktop: sidebar takes 256px */}
      <main className="flex-1 overflow-y-auto min-w-0 lg:pl-0 pl-0">
        {/* Mobile top padding so hamburger button doesn't cover content */}
        <div className="lg:hidden h-14" />
        {children}
      </main>

      {/* Forced password setup modal overlay rendered directly on the dashboard */}
      {user?.mustChangePassword && (
        <ForcePasswordChangeModal
          userEmail={user.email}
          restaurantName={restaurant.name}
        />
      )}
    </div>
  );
}
