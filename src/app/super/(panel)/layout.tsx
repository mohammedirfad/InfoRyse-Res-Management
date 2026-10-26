import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

// This layout ONLY wraps /super/dashboard, /super/restaurants, etc.
// NOT /super/login — so there is no infinite redirect loop possible.
export default async function SuperPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/super/login");
  }

  return (
    <div className="super-panel-shell min-h-screen flex bg-gray-50">
      <SuperAdminSidebar />
      <main className="super-panel-main min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
