"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Search, X, ShoppingCart, Wifi, ChevronUp, ArrowLeft } from "lucide-react";
import { LandingPage } from "./landing";
import { useCart, formatRupees, type MenuItem } from "@/components/CartContext";

/* ── types ──────────────────────────────────────────────────────────────────── */
type Category  = { id: string; name: string; menuItems: MenuItem[] };
type MenuData  = {
  restaurant: { name: string; openNow: boolean; address?: string; logoUrl?: string | null; taxName?: string; taxPercent?: number };
  table:       { id?: string; label: string; status: string; activeSessionId?: string | null };
  categories:  Category[];
};

/* ── helpers ────────────────────────────────────────────────────────────────── */
const CAT_EMOJI: Record<string, string> = {
  food:"🍽️", breakfast:"🥞", lunch:"🍱", dinner:"🍽️", "main course":"🍛",
  starters:"🥗", starter:"🥗", beverages:"🥤", drinks:"🥤", bar:"🍸",
  desserts:"🍰", snacks:"🍿", pizza:"🍕", combos:"🎁", specials:"⭐",
};
const catEmoji = (n: string) => {
  const l = n.toLowerCase();
  for (const [k,v] of Object.entries(CAT_EMOJI)) if (l.includes(k)) return v;
  return "🍽️";
};

const GRAD = [
  "from-orange-100 to-amber-200","from-rose-100 to-pink-200",
  "from-green-100 to-emerald-200","from-purple-100 to-violet-200",
  "from-sky-100 to-blue-200","from-yellow-100 to-orange-200",
];
const grad = (i:number) => GRAD[i % GRAD.length];

/* ── VegDot ─────────────────────────────────────────────────────────────────── */
function VegDot({ isVeg, size="md" }:{ isVeg:boolean; size?:"sm"|"md" }) {
  const s = size==="sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const d = size==="sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <span className={`${s} rounded-sm border-2 flex-shrink-0 flex items-center justify-center
      ${isVeg?"border-green-600":"border-red-600"}`}>
      <span className={`${d} rounded-full ${isVeg?"bg-green-600":"bg-red-600"}`}/>
    </span>
  );
}

/* ── ASSISTANCE SERVICES ─────────────────────────────────────────────────────── */
const SERVICES = [
  { id:"pay_bill",   icon:"🧾", label:"Pay Bill",          section:"table"    },
  { id:"wifi",       icon:"📶", label:"Wi-Fi Password",    section:"assist"   },
  { id:"water",      icon:"💧", label:"Water Bottle",      section:"assist"   },
  { id:"waiter",     icon:"🔔", label:"Call Waiter",       section:"assist"   },
  { id:"cutlery",    icon:"🍴", label:"Extra Cutlery",     section:"assist"   },
  { id:"lighter",    icon:"🔥", label:"Lighter",           section:"assist"   },
  { id:"sauce",      icon:"🫙", label:"Sauce/Condiments",  section:"assist"   },
  { id:"ice",        icon:"🧊", label:"Ice/Cold Water",    section:"assist"   },
  { id:"tissues",    icon:"🧻", label:"Tissues",           section:"assist"   },
  { id:"packing",    icon:"📦", label:"Packing Box",       section:"assist"   },
  { id:"chair",      icon:"🪑", label:"Extra Chair",       section:"assist"   },
  { id:"cake",       icon:"🎂", label:"Cake Cutting",      section:"special"  },
  { id:"candle",     icon:"🕯️", label:"Candle",           section:"special"  },
  { id:"birthday",   icon:"🎉", label:"Birthday Setup",    section:"special"  },
];

function AssistanceSheet({
  tableLabel, slug, qrToken, onClose,
}:{
  tableLabel:string; slug:string; qrToken:string; onClose:()=>void;
}) {
  const [sent, setSent]       = useState<string[]>([]);
  const [custom, setCustom]   = useState("");
  const [sending, setSending] = useState(false);

  async function send(ids: string[], customText?: string) {
    setSending(true);
    // Notify the restaurant via the assistance API
    try {
      await fetch("/api/public/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, qrToken, tableLabel, requests: ids, custom: customText }),
      });
    } catch { /* silent — best effort */ }
    setSent(ids);
    setSending(false);
    setTimeout(onClose, 2000);
  }

  const tableServices  = SERVICES.filter(s => s.section === "table");
  const assistServices = SERVICES.filter(s => s.section === "assist");
  const specialServices= SERVICES.filter(s => s.section === "special");
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id:string) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  if (sent.length > 0) return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full bg-white rounded-t-3xl p-8 text-center shadow-2xl animate-slide-up">
        <div className="text-6xl mb-4 animate-bounce">✅</div>
        <h3 className="font-bold text-gray-900 text-xl">Request Sent!</h3>
        <p className="text-gray-500 text-sm mt-2">Staff has been notified. We'll be with you shortly.</p>
        <p className="text-xs text-gray-400 mt-1">Table {tableLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"/>
      <div className="relative w-full bg-white rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Request Assistance</h2>
            <p className="text-xs text-gray-400">Table {tableLabel} · tap what you need</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Your table */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Table</p>
            {tableServices.map(s => (
              <button key={s.id} onClick={() => send([s.id])}
                className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3.5 mb-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all">
                <span className="text-xl">{s.icon}</span>{s.label}
                <span className="ml-auto text-gray-300">›</span>
              </button>
            ))}
          </div>

          {/* Assistance */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assistance</p>
            <div className="grid grid-cols-2 gap-2.5">
              {assistServices.map(s => (
                <button key={s.id} onClick={()=>toggle(s.id)}
                  className={`flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-3 text-sm font-medium text-gray-700 active:scale-[0.97] transition-all
                    ${selected.includes(s.id)?"border-gray-900 bg-gray-50":"border-gray-100 hover:border-gray-200"}`}>
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-left leading-tight">{s.label}</span>
                  {selected.includes(s.id) && <span className="ml-auto text-[10px] font-bold text-gray-900">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Special occasions */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Special Occasions</p>
            <div className="grid grid-cols-3 gap-2">
              {specialServices.map(s => (
                <button key={s.id} onClick={()=>toggle(s.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-medium text-gray-700 active:scale-95 transition-all
                    ${selected.includes(s.id)?"border-purple-400 bg-purple-50":"border-gray-100 hover:border-gray-200"}`}>
                  <span className="text-2xl">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Other Request</p>
            <textarea className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-200"
              rows={2} placeholder="Tell us anything… e.g. I have a nut allergy"
              value={custom} onChange={e=>setCustom(e.target.value)}/>
          </div>

          {/* Send button */}
          {(selected.length > 0 || custom.trim()) && (
            <button onClick={()=>send(selected, custom.trim()||undefined)} disabled={sending}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-60">
              {sending ? "Sending…" : `Notify Staff${selected.length>0?` (${selected.length} request${selected.length>1?"s":""})`:""}` }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Item card (horizontal grid) ─────────────────────────────────────────────── */
function ItemCard({ item, idx, justAdded, onAdd, onView }:{
  item:MenuItem; idx:number; justAdded:string|null;
  onAdd:(i:MenuItem,e:React.MouseEvent)=>void;
  onView:(i:MenuItem)=>void;
}) {
  return (
    <div
      onClick={()=>onView(item)}
      className={`flex-shrink-0 cursor-pointer ${!item.isAvailable?"opacity-50":""}`}
      style={{ width:136 }}>
      <div className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${grad(idx)} shadow-sm mb-2`}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        <button
          onClick={e=>onAdd(item,e)}
          disabled={!item.isAvailable}
          className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-base shadow-md transition-all active:scale-90
            ${justAdded===item.id?"bg-green-500 text-white scale-95":"bg-white text-gray-900 hover:bg-gray-900 hover:text-white"}`}>
          {justAdded===item.id?"✓":"+"}
        </button>
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-red-400 bg-white/90 px-2 py-0.5 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="flex items-start gap-1 mb-0.5">
        <VegDot isVeg={item.isVeg} size="sm"/>
        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug flex-1">{item.name}</p>
      </div>
      {item.description && <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>}
      <p className="text-sm font-bold text-gray-900 mt-1">{formatRupees(item.priceCents)}</p>
    </div>
  );
}

/* ── MAIN PAGE ──────────────────────────────────────────────────────────────── */
export default function MenuPage({ params }:{ params:{ slug:string; qrToken:string } }) {
  const [data, setData]         = useState<MenuData|null>(null);
  const [error, setError]       = useState<string|null>(null);
  const [activeCat, setActiveCat]   = useState<string|null>(null);
  const [search, setSearch]     = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [justAdded, setJustAdded]   = useState<string|null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem|null>(null);
  const [showAssist, setShowAssist] = useState(false);
  const [vegFilter, setVegFilter]   = useState<"all"|"veg"|"nonveg">("all");
  const [heroIdx, setHeroIdx]   = useState(0);
  const [heroFrozen, setHeroFrozen] = useState(false); // stop auto-advance on interaction
  const [phase, setPhase]       = useState<"landing"|"menu">("landing"); // landing splash first
  const searchRef = useRef<HTMLInputElement>(null);
  const { addItem, totalCount, totalCents, syncSession } = useCart();

  /* fetch + cache in sessionStorage */
  useEffect(() => {
    const cacheKey = `menu_${params.slug}_${params.qrToken}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const j: MenuData = JSON.parse(cached);
        setData(j);
        setActiveCat(j.categories[0]?.id ?? null);
        syncSession(j.table.activeSessionId, j.table.status);
        // still refresh in background
      } catch { /* ignore */ }
    }
    fetch(`/api/public/menu/${params.slug}/${params.qrToken}`, {
      headers: { "Cache-Control": "no-cache" },
    })
      .then(async r => {
        let json: any = null;
        try { json = await r.json(); } catch {
          throw new Error("Menu temporarily unavailable. Please try again.");
        }
        if (!r.ok) throw new Error(json?.error ?? "Unable to load menu.");
        return json;
      })
      .then((j: MenuData) => {
        setData(j);
        setActiveCat(j.categories[0]?.id ?? null);
        syncSession(j.table.activeSessionId, j.table.status);
        sessionStorage.setItem(cacheKey, JSON.stringify(j));
      })
      .catch(e => { if (!data) setError(e.message); });
  }, [params.slug, params.qrToken, syncSession]);

  /* hero auto-advance — stable, won't re-trigger on every render */
  const allItems = useMemo(() => data?.categories.flatMap(c=>c.menuItems).filter(i=>i.isAvailable) ?? [], [data]);
  const heroTotal = Math.min(allItems.length, 8);

  useEffect(() => {
    if (heroFrozen || heroTotal === 0) return;
    const t = setInterval(() => setHeroIdx(i => (i+1) % heroTotal), 3500);
    return () => clearInterval(t);
  }, [heroFrozen, heroTotal]);

  /* search focus */
  useEffect(() => { if (showSearch) searchRef.current?.focus(); }, [showSearch]);

  const catItems = useMemo(() => {
    if (!data) return [];
    let items = data.categories.find(c=>c.id===activeCat)?.menuItems ?? [];
    if (search.trim()) items = allItems.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
    if (vegFilter==="veg")    items=items.filter(i=>i.isVeg);
    if (vegFilter==="nonveg") items=items.filter(i=>!i.isVeg);
    return items;
  }, [data, activeCat, search, vegFilter, allItems]);

  function addToCart(item:MenuItem, e?:React.MouseEvent) {
    e?.stopPropagation();
    if (!item.isAvailable) return;
    addItem(item);
    setJustAdded(item.id);
    setTimeout(()=>setJustAdded(null), 1000);
  }

  /* ── Loading ───────────────────────────────────────────────────────────────── */
  if (!data && !error) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5 px-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-gray-900 animate-spin"/>
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🍽️</div>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-800 text-lg">Loading your menu…</p>
        <p className="text-gray-400 text-sm mt-1">Getting everything ready</p>
      </div>
    </div>
  );

  /* ── Error ─────────────────────────────────────────────────────────────────── */
  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        <div className="text-7xl mb-5">📶</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Can't load menu</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{error}</p>
        <button onClick={()=>{ setError(null); window.location.reload(); }}
          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all">
          Try again
        </button>
        <p className="text-xs text-gray-300 mt-4">If this keeps happening, ask a staff member for help.</p>
      </div>
    </div>
  );

  const d = data!;
  const isOccupied = d.table.status === "OCCUPIED";
  const featuredItems = allItems.slice(0, 8);

  /* ── LANDING SPLASH PAGE ──────────────────────────────────────────────────── */
  if (phase === "landing") return (
    <LandingPage
      restaurantName={d.restaurant.name}
      restaurantLogo={d.restaurant.logoUrl}
      tableLabel={d.table.label}
      isOccupied={isOccupied}
      isOpen={d.restaurant.openNow}
      featuredItems={featuredItems}
      totalItems={allItems.length}
      categories={d.categories.length}
      cartCount={totalCount}
      cartTotalCents={totalCents}
      slug={params.slug}
      qrToken={params.qrToken}
      onEnterMenu={() => setPhase("menu")}
      onOpenAssist={() => setShowAssist(true)}
    />
  );

  /* ── MENU PAGE ──────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom:"5.5rem" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        {/* Cashback banner */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">%</div>
          <span className="text-xs font-semibold text-purple-700">Get 10% cashback</span>
          <span className="text-xs text-purple-400">· After bill payment</span>
          <button className="ml-auto text-xs font-bold text-purple-600">Login to avail</button>
        </div>

        {/* Name + controls */}
        <div className="flex items-center px-4 py-2.5 gap-2 min-h-[52px]">
          {showSearch ? (
            <>
              <button onClick={()=>{ setShowSearch(false); setSearch(""); }} className="p-1.5 flex-shrink-0">
                <ArrowLeft className="h-5 w-5 text-gray-700"/>
              </button>
              <input ref={searchRef}
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none"
                placeholder="Search dishes…"
                value={search} onChange={e=>setSearch(e.target.value)}/>
              {search && <button onClick={()=>setSearch("")}><X className="h-4 w-4 text-gray-400"/></button>}
            </>
          ) : (
            <>
              <button onClick={()=>setPhase("landing")} className="p-1.5 flex-shrink-0">
                <ArrowLeft className="h-5 w-5 text-gray-600"/>
              </button>
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-900 text-base leading-tight">{d.restaurant.name}</p>
                <p className="text-[10px] text-gray-400">Table {d.table.label}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={()=>setShowSearch(true)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Search className="h-4 w-4 text-gray-600"/>
                </button>
                {totalCount > 0 && (
                  <Link href={`/r/${params.slug}/${params.qrToken}/cart`}
                    className="relative p-2 rounded-full bg-gray-900 text-white">
                    <ShoppingCart className="h-4 w-4"/>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                      {totalCount>9?"9+":totalCount}
                    </span>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Not occupied warning ───────────────────────────────────────────────── */}
      {!isOccupied && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-amber-700 font-medium">Ask staff to activate this table before ordering</p>
        </div>
      )}

      {/* ── HERO CAROUSEL ─────────────────────────────────────────────────────── */}
      {!showSearch && featuredItems.length > 0 && (
        <div className="pt-4 pb-2">
          <div className="text-center mb-3 px-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{d.restaurant.name}</p>
            <p className="text-sm text-gray-500">{d.categories.find(c=>c.id===activeCat)?.name ?? "Our Menu"}</p>
          </div>

          {/* Stable carousel — CSS transitions only, no layout shifts */}
          <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 260 }}>
            {featuredItems.map((item, idx) => {
              const offset = idx - heroIdx;
              const absOff = Math.abs(offset);
              const isCenter = offset === 0;
              const hidden = absOff > 2;
              return (
                <div key={item.id}
                  onClick={() => {
                    if (!isCenter) { setHeroIdx(idx); setHeroFrozen(true); setTimeout(()=>setHeroFrozen(false),5000); }
                    else setSelectedItem(item);
                  }}
                  style={{
                    position:"absolute",
                    width: isCenter ? 200 : 130,
                    height: isCenter ? 200 : 130,
                    left: "50%",
                    transform: `translateX(calc(-50% + ${offset * 155}px)) scale(${isCenter?1:0.85})`,
                    opacity: hidden ? 0 : isCenter ? 1 : 0.6,
                    zIndex: isCenter ? 10 : 10-absOff,
                    transition: "all 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",
                    pointerEvents: hidden ? "none" : "auto",
                  }}
                  className="cursor-pointer">
                  <div className={`w-full h-full rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${grad(idx)}`}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active item info — below carousel, no layout shift */}
          {featuredItems[heroIdx] && (
            <div className="text-center px-8 mt-2 min-h-[72px]">
              <p className="font-bold text-gray-900 text-base leading-snug">{featuredItems[heroIdx].name}</p>
              {featuredItems[heroIdx].description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{featuredItems[heroIdx].description}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="font-bold text-gray-900">{formatRupees(featuredItems[heroIdx].priceCents)}</span>
                <button onClick={e=>addToCart(featuredItems[heroIdx],e)}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-all active:scale-90
                    ${justAdded===featuredItems[heroIdx].id
                      ?"bg-green-500 text-white border-green-500"
                      :"bg-white text-gray-900 border-gray-900 hover:bg-gray-900 hover:text-white"}`}>
                  {justAdded===featuredItems[heroIdx].id ? "Added ✓" : "Add to cart"}
                </button>
              </div>
            </div>
          )}

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {featuredItems.map((_,i)=>(
              <button key={i} onClick={()=>{ setHeroIdx(i); setHeroFrozen(true); setTimeout(()=>setHeroFrozen(false),5000); }}
                className={`rounded-full transition-all ${i===heroIdx?"w-5 h-1.5 bg-gray-900":"w-1.5 h-1.5 bg-gray-200"}`}/>
            ))}
          </div>
        </div>
      )}

      {/* ── MENU SECTION ──────────────────────────────────────────────────────── */}
      <div className="mt-6 px-4">
        <div className="text-center mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest">What's on</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontFamily:"Georgia,serif" }}>The menu</h2>
        </div>

        {/* Category tiles */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {d.categories.map((c,i)=>(
            <button key={c.id} onClick={()=>setActiveCat(c.id)}
              className={`flex-shrink-0 flex flex-col items-start justify-end rounded-2xl overflow-hidden
                transition-all active:scale-95 ${activeCat===c.id?"ring-2 ring-gray-900":""}`}
              style={{ width:90, height:100 }}>
              <div className={`w-full h-full flex flex-col items-start justify-end p-2.5
                ${activeCat===c.id?"bg-gray-900":"bg-gradient-to-b from-[#2a3f6f] to-[#1a2a5e]"} text-white`}>
                <span className="text-xl mb-1">{catEmoji(c.name)}</span>
                <p className="text-[11px] font-bold leading-tight text-left">{c.name}</p>
                <p className="text-[9px] text-white/50 mt-0.5">{c.menuItems.length} items</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="sticky z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100"
        style={{ top: 92 }}>
        {/* Sub-cat tabs */}
        {!showSearch && (
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar px-4 pt-2 pb-0">
            {d.categories.map(c=>(
              <button key={c.id} onClick={()=>setActiveCat(c.id)}
                className={`flex-shrink-0 text-xs font-semibold px-4 py-2 border-b-2 transition-all whitespace-nowrap
                  ${activeCat===c.id?"border-gray-900 text-gray-900":"border-transparent text-gray-400"}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        {/* Veg filter */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-gray-400 mr-1 flex-shrink-0">Filters</span>
          {(["veg","nonveg"] as const).map(f=>(
            <button key={f} onClick={()=>setVegFilter(vegFilter===f?"all":f)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all
                ${vegFilter===f
                  ? f==="veg"?"border-green-600 bg-green-600 text-white":"border-red-500 bg-red-500 text-white"
                  :"border-gray-200 text-gray-500"}`}>
              <VegDot isVeg={f==="veg"} size="sm"/>
              {f==="veg"?"Veg":"Non-veg"}
            </button>
          ))}
          {search && <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{catItems.length} found</span>}
        </div>
      </div>

      {/* ── Items ─────────────────────────────────────────────────────────────── */}
      <div className="px-4 mt-3">
        {catItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-gray-500 font-medium">No items found</p>
            {(search||vegFilter!=="all") && (
              <button onClick={()=>{ setSearch(""); setVegFilter("all"); }}
                className="mt-3 text-sm font-bold text-gray-900 underline">Clear filters</button>
            )}
          </div>
        ) : (() => {
          const veg    = catItems.filter(i=>i.isVeg);
          const nonVeg = catItems.filter(i=>!i.isVeg);
          const sections: { title:string; items:MenuItem[] }[] =
            vegFilter==="all" && veg.length && nonVeg.length
              ? [{ title:"Vegetarian", items:veg },{ title:"Non-Vegetarian", items:nonVeg }]
              : [{ title:"", items:catItems }];

          return sections.map(({ title, items }, si)=>(
            <div key={si} className="mb-8">
              {title && (
                <div className="flex items-center gap-2 mb-3">
                  <VegDot isVeg={title==="Vegetarian"}/>
                  <span className="text-sm font-bold text-gray-700">{title}</span>
                  <div className="flex-1 h-px bg-gray-100"/>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {items.map((item,idx)=>(
                  <ItemCard key={item.id} item={item} idx={idx} justAdded={justAdded} onAdd={addToCart} onView={setSelectedItem}/>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* ── Item detail sheet ─────────────────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={()=>setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"/>
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e=>e.stopPropagation()}>
            <div className="relative h-52 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
              {selectedItem.imageUrl
                ? <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-7xl">🍽️</div>}
              <button onClick={()=>setSelectedItem(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                <X className="h-4 w-4 text-gray-700"/>
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <VegDot isVeg={selectedItem.isVeg}/>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedItem.isVeg?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>
                  {selectedItem.isVeg?"Vegetarian":"Non-Vegetarian"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{selectedItem.description}</p>
              )}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <span className="text-2xl font-bold text-gray-900">{formatRupees(selectedItem.priceCents)}</span>
                <button disabled={!selectedItem.isAvailable}
                  onClick={()=>{ addItem(selectedItem); setSelectedItem(null); }}
                  className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
                  {selectedItem.isAvailable?"Add to cart":"Unavailable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assistance sheet ─────────────────────────────────────────────────── */}
      {showAssist && (
        <AssistanceSheet tableLabel={d.table.label} slug={params.slug} qrToken={params.qrToken}
          onClose={()=>setShowAssist(false)}/>
      )}

      {/* ── Floating cart bar ─────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="fixed z-20 px-4 left-0 right-0" style={{ bottom:"64px" }}>
          <Link href={`/r/${params.slug}/${params.qrToken}/cart`}
            className="flex items-center justify-between bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/30 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5"/>
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 rounded-full text-[9px] w-5 h-5 flex items-center justify-center font-extrabold">
                  {totalCount}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">{totalCount} item{totalCount>1?"s":""} in cart</p>
                <p className="text-[10px] text-white/50">Tap to review</p>
              </div>
            </div>
            <span className="font-bold">{formatRupees(totalCents)} ›</span>
          </Link>
        </div>
      )}

      {/* ── Bottom nav bar ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-2.5 flex items-center justify-around">
        <button className="flex flex-col items-center gap-0.5 text-gray-900">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Menu</span>
        </button>
        <Link href={`/r/${params.slug}/${params.qrToken}/cart`}
          className="flex flex-col items-center gap-0.5 text-gray-400 relative">
          <ShoppingCart className="h-5 w-5"/>
          {totalCount>0 && (
            <span className="absolute -top-1 right-2 bg-red-500 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center font-bold">
              {totalCount>9?"9+":totalCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Cart</span>
        </Link>
        <button onClick={()=>setShowAssist(true)}
          className="flex flex-col items-center gap-0.5 text-gray-400 active:scale-90 transition-transform">
          <span className="text-xl">💧</span>
          <span className="text-[10px] font-medium">Water</span>
        </button>
        <button onClick={()=>setShowAssist(true)}
          className="flex flex-col items-center gap-0.5 text-gray-400 active:scale-90 transition-transform">
          <span className="text-xl">🔔</span>
          <span className="text-[10px] font-medium">Waiter</span>
        </button>
        <button onClick={()=>setShowAssist(true)}
          className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100 transition-colors">
          <ChevronUp className="h-4 w-4"/>
        </button>
      </div>
    </div>
  );
}
