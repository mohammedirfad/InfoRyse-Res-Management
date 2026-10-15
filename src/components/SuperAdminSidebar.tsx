"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, ShoppingBag, Users, UtensilsCrossed, Tag,
  CreditCard, BarChart2, FileText, HeadphonesIcon, UserCog, Settings,
  ClipboardList, LogOut, Zap
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/super/dashboard",   label: "Dashboard",         icon: LayoutDashboard },
  { href: "/super/restaurants", label: "Restaurants",       icon: Building2       },
  { href: "/super/orders",      label: "Orders",            icon: ShoppingBag     },
  { href: "/super/users",       label: "User Management",   icon: UserCog         },
  { href: "/super/audit-logs",  label: "Audit Logs",        icon: ClipboardList   },
  { href: "/super/settings",    label: "Settings",          icon: Settings        },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 super-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1F4733] to-[#132A1E] border border-[#D4A94C]/30 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src="/icon.svg" alt="InfoRyse" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight">
              Info<span className="text-[#D4A94C]">Ryse</span>
            </p>
            <p className="text-[10px] text-[#D4A94C] font-semibold leading-tight tracking-wider uppercase">Enterprise Cloud</p>
          </div>
        </div>
        <div className="mt-3 bg-white/5 rounded-xl px-3 py-2">
          <p className="text-[10px] text-white/50 leading-none">Super Admin Panel</p>
          <p className="text-xs text-white/80 font-medium mt-0.5">Hospitality SaaS Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/super/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={active ? "super-nav-item-active" : "super-nav-item"}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10">
        <div className="bg-white/5 rounded-xl px-3 py-2.5 mb-2">
          <p className="text-xs text-white/60">Manage all restaurants, users, orders and platform settings from one place.</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
