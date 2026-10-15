"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, LayoutGrid, QrCode,
  Tag, Users, BarChart2, User, Settings, ChefHat, Bell, Menu, X, Receipt
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin/dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { href: "/admin/orders",     label: "Orders",             icon: ShoppingBag,  badge: true },
  { href: "/admin/bill",       label: "Table Bill",         icon: Receipt },
  { href: "/admin/menu",       label: "Menu Management",    icon: UtensilsCrossed },
  { href: "/admin/tables",     label: "Table Management",   icon: LayoutGrid },
  { href: "/admin/qr-menu",    label: "QR Menu",            icon: QrCode },
  { href: "/admin/customers",  label: "Customers",          icon: Users },
  { href: "/admin/offers",     label: "Offers & Promotions",icon: Tag,           ownerOnly: true },
  { href: "/admin/analytics",  label: "Analytics",          icon: BarChart2,     ownerOnly: true },
  { href: "/admin/staff",      label: "Staff Management",   icon: ChefHat,       ownerOnly: true },
  { href: "/admin/profile",    label: "Restaurant Profile", icon: User,          ownerOnly: true },
  { href: "/admin/settings",   label: "Settings",           icon: Settings,      ownerOnly: true },
];

interface Props {
  restaurant: { name: string; openNow: boolean; slug: string } | null;
  userRole?: string;
}

export default function AdminSidebar({ restaurant, userRole = "OWNER" }: Props) {
  const pathname    = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const visibleNav = NAV.filter((item) => {
    if (userRole === "STAFF" && item.ownerOnly) return false;
    return true;
  });

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1F4733] to-[#132A1E] border border-[#D4A94C]/30 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src="/icon.svg" alt="InfoRyse" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-white text-lg tracking-tight leading-tight">
              Info<span className="text-[#D4A94C]">Ryse</span>
            </p>
            <p className="text-[9px] font-bold text-[#D4A94C]/90 tracking-wider uppercase leading-tight">
              Restaurant OS
            </p>
          </div>
          {/* Close button — mobile only */}
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden p-1 text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {restaurant && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium truncate max-w-[130px]">{restaurant.name}</p>
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0
                ${restaurant.openNow ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${restaurant.openNow ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                {restaurant.openNow ? "Open" : "Closed"}
              </div>
            </div>
            <div className="flex items-center">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                userRole === "STAFF" ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
              }`}>
                {userRole === "STAFF" ? "Staff Operations" : "Owner / Admin"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`${
                active ? "admin-nav-item-active" : "admin-nav-item"
              } active:scale-[0.98] transition-all`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-1">
        <Link href="/admin/dashboard" className="admin-nav-item text-sm">
          <Bell className="h-4 w-4" />Notifications
        </Link>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 admin-sidebar flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile hamburger button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-[#132A1E] text-white shadow-lg"
        aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile overlay sidebar ──────────────────────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)} />
          {/* Sidebar panel */}
          <aside className="relative w-72 admin-sidebar flex flex-col h-full animate-slide-in-right shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
