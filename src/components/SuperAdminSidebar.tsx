"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, ShoppingBag, Users, UtensilsCrossed, Tag,
  CreditCard, BarChart2, FileText, HeadphonesIcon, UserCog, Settings,
  ClipboardList, LogOut, Zap, Menu, X
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
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const contents = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4A94C]/30 bg-[#132A1E] p-1.5"><img src="/icon.svg" alt="InfoRyse" className="h-full w-full object-contain" /></div><div><p className="font-bold text-white">Info<span className="text-[#D4A94C]">Ryse</span></p><p className="text-[10px] uppercase tracking-wider text-[#D4A94C]">Super Admin</p></div></div>
        <button onClick={() => setOpen(false)} aria-label="Close navigation" className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"><X className="h-5 w-5"/></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{NAV.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/super/dashboard" && pathname.startsWith(href)); return <Link key={href} href={href} className={active ? "super-nav-item-active" : "super-nav-item"}><Icon className="h-4 w-4 shrink-0"/><span>{label}</span></Link>; })}</nav>
      <div className="border-t border-white/10 p-3"><LogoutButton/></div>
    </>
  );

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col super-sidebar lg:flex">
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
    <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-[#0B1736] px-3 text-white shadow-sm lg:hidden"><button onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 hover:bg-white/10"><Menu className="h-5 w-5"/></button><span className="text-sm font-bold">InfoRyse <span className="font-normal text-white/60">Super Admin</span></span></div>
    {open && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}/><aside className="relative flex h-full w-[min(18rem,88vw)] flex-col super-sidebar shadow-2xl">{contents}</aside></div>}
    </>
  );
}
