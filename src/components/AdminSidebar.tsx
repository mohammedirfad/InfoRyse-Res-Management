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
  { href: "/admin/offers",     label: "Offers & Promotions",icon: Tag },
  { href: "/admin/customers",  label: "Customers",          icon: Users },
  { href: "/admin/analytics",  label: "Analytics",          icon: BarChart2 },
  { href: "/admin/staff",      label: "Staff Management",   icon: ChefHat },
  { href: "/admin/profile",    label: "Restaurant Profile", icon: User },
  { href: "/admin/settings",   label: "Settings",           icon: Settings },
];

interface Props {
  restaurant: { name: string; openNow: boolean; slug: string } | null;
}

export default function AdminSidebar({ restaurant }: Props) {
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#D4A94C]/20 flex items-center justify-center text-[#D4A94C] font-bold text-lg">
            K
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-base leading-tight">Kpe</p>
            <p className="text-[10px] text-[#D4A94C] leading-tight truncate">Good Food · Brighter Moments</p>
          </div>
          {/* Close button — mobile only */}
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden p-1 text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {restaurant && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-white font-medium truncate max-w-[130px]">{restaurant.name}</p>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0
              ${restaurant.openNow ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${restaurant.openNow ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {restaurant.openNow ? "Open" : "Closed"}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={active ? "admin-nav-item-active" : "admin-nav-item"}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">{label}</span>
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
