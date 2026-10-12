"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingCart, ChevronDown } from "lucide-react";

type FoodItem = { id: string; name: string; priceCents: number; imageUrl?: string | null; isVeg: boolean };

interface LandingProps {
  restaurantName:  string;
  restaurantLogo?: string | null;
  tableLabel:      string;
  isOccupied:      boolean;
  isOpen:          boolean;
  featuredItems:   FoodItem[];
  totalItems:      number;
  categories:      number;
  cartCount:       number;
  slug:            string;
  qrToken:         string;
  onEnterMenu:     () => void;
}

const FOOD_EMOJIS = ["🍕","🍔","🍜","🍛","🥗","🍱","🥞","🍰","🥤","🍸","🫕","🥩","🥘","🍲","🧆"];

function formatRupees(c: number) { return `₹${(c / 100).toFixed(0)}`; }

// ── Parallax floating particle ────────────────────────────────────────────────
function FloatingParticle({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none" style={style}>
      {emoji}
    </div>
  );
}

export function LandingPage({
  restaurantName, restaurantLogo, tableLabel, isOccupied, isOpen,
  featuredItems, totalItems, categories, cartCount, slug, qrToken, onEnterMenu,
}: LandingProps) {
  const [visible,   setVisible]   = useState(false);
  const [scrollY,   setScrollY]   = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Stagger entrance
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Parallax on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  // Generate stable particles (same across renders)
  const particles = FOOD_EMOJIS.map((emoji, i) => ({
    emoji,
    style: {
      left:      `${4 + (i * 13 % 90)}%`,
      top:       `${5 + (i * 17 % 85)}%`,
      fontSize:  `${1.2 + (i % 3) * 0.5}rem`,
      opacity:   0.04 + (i % 4) * 0.015,
      transform: `rotate(${-25 + i * 14}deg)`,
      animation: `floatP${i % 5} ${7 + i % 5}s ease-in-out infinite`,
      animationDelay: `${i * 0.3}s`,
    } as React.CSSProperties,
  }));

  const fanItems = featuredItems.slice(0, 4);

  return (
    <div ref={containerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory"
      style={{ scrollBehavior: "smooth" }}>

      {/* ── SECTION 1: Full-screen hero ────────────────────────────────────── */}
      <section className="snap-start relative h-screen flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(155deg,#071510 0%,#0d1f15 30%,#132A1E 60%,#1a3d26 85%,#0d1f15 100%)" }}>

        {/* ── Animated blobs ───────────────────────────────────────────────── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large slow-moving radial blobs */}
          {[
            { w:500, h:500, l:-100, t:-100, c:"rgba(212,169,76,0.08)",  dur:12 },
            { w:400, h:400, r:-80,  b:-80,  c:"rgba(34,197,94,0.07)",   dur:15 },
            { w:350, h:350, l:"35%",t:"25%",c:"rgba(255,255,255,0.025)",dur:20 },
            { w:250, h:250, r:"10%",t:"40%",c:"rgba(212,169,76,0.05)",  dur:10 },
          ].map((b, i) => (
            <div key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width:b.w, height:b.h,
                left:b.l, right:(b as any).r, top:b.t, bottom:(b as any).b,
                background: `radial-gradient(circle,${b.c} 0%,transparent 70%)`,
                animation: `blobPulse ${b.dur}s ease-in-out infinite`,
                animationDelay: `${i * 2}s`,
              }}/>
          ))}

          {/* Moving light streak */}
          <div className="absolute inset-0"
            style={{
              background: "linear-gradient(105deg,transparent 40%,rgba(212,169,76,0.04) 50%,transparent 60%)",
              animation: "lightStreak 8s ease-in-out infinite",
            }}/>
        </div>

        {/* ── Floating food emojis ─────────────────────────────────────────── */}
        {particles.map((p, i) => (
          <FloatingParticle key={i} emoji={p.emoji} style={p.style} />
        ))}

        {/* ── Hero content (parallax) ──────────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 w-full"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}>

          {/* Restaurant logo — if exists */}
          {restaurantLogo && (
            <div className={`mb-5 transition-all duration-700 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
              style={{ transitionDelay: "0ms" }}>
              <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl mx-auto bg-white/10">
                <img src={restaurantLogo} alt={restaurantName}
                  className="w-full h-full object-cover"
                  onError={() => { /* hide on error */ }} />
              </div>
            </div>
          )}

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 mb-5
            bg-white/6 backdrop-blur-sm border border-white/10
            transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: "50ms" }}>
            <div className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-white/60 text-xs font-medium">
              {isOpen ? "Open Now" : "Currently Closed"}
              <span className="text-white/30 mx-2">·</span>
              <span className="text-[#D4A94C] font-semibold">Table {tableLabel}</span>
            </span>
          </div>

          {/* Restaurant name */}
          <h1 className={`text-white leading-none mb-3 transition-all duration-700
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{
              fontFamily:   "Georgia,'Times New Roman',serif",
              fontSize:     "clamp(2.5rem,9vw,4rem)",
              textShadow:   "0 4px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05)",
              transitionDelay: "120ms",
              letterSpacing: "-0.01em",
            }}>
            {restaurantName}
          </h1>

          <p className={`text-white/35 text-sm italic mb-7 transition-all duration-700
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: "200ms" }}>
            Good Food · Brighter Moments
          </p>

          {/* Fanned food images */}
          {fanItems.length > 0 && (
            <div className={`relative h-28 w-52 mb-7 transition-all duration-700
              ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
              style={{ transitionDelay: "280ms" }}>
              {fanItems.map((item, i) => {
                const rots  = [-18, -7, 5, 16];
                const txs   = [-36, -12, 12, 36];
                const tys   = [8, 0, 0, 8];
                return (
                  <div key={item.id}
                    className="absolute top-0 left-1/2 w-[72px] h-[72px] rounded-2xl overflow-hidden
                      border-2 border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                      transition-all duration-500 hover:scale-110 hover:z-20 cursor-pointer"
                    style={{
                      transform: `translateX(calc(-50% + ${txs[i]}px)) translateY(${tys[i]}px) rotate(${rots[i]}deg)`,
                      zIndex: i + 1,
                    }}
                    onClick={onEnterMenu}>
                    {item.imageUrl && !imgErrors[i]
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
                          onError={() => setImgErrors(p => ({ ...p, [i]: true }))} />
                      : <div className={`w-full h-full flex items-center justify-center text-3xl
                          ${["bg-orange-900/60","bg-emerald-900/60","bg-rose-900/60","bg-amber-900/60"][i]}`}>
                          {FOOD_EMOJIS[i * 2]}
                        </div>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className={`flex items-center gap-6 mb-7 transition-all duration-700
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: "360ms" }}>
            {[
              { val: totalItems,  label: "dishes"     },
              { val: categories,  label: "categories" },
              { val: featuredItems.filter(i => i.isVeg).length, label: "veg" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-white font-bold text-2xl leading-none">{s.val}</p>
                <p className="text-white/35 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Cashback */}
          <div className={`bg-[#D4A94C]/12 border border-[#D4A94C]/20 rounded-full px-5 py-2.5 mb-1
            transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            style={{ transitionDelay: "430ms" }}>
            <span className="text-[#D4A94C] font-semibold text-sm">🎁 Get 10% cashback on every bill</span>
          </div>
        </div>

        {/* Not occupied warning */}
        {!isOccupied && (
          <div className="relative z-10 mx-5 mb-3">
            <div className="bg-amber-500/15 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <p className="text-amber-200 text-sm font-medium">Ask our staff to seat you before ordering</p>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className={`relative z-10 w-full px-5 pb-8 space-y-2.5
          transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "500ms" }}>
          <button onClick={onEnterMenu}
            className="w-full bg-white text-[#132A1E] py-4 rounded-2xl font-bold text-base
              shadow-[0_8px_40px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all
              flex items-center justify-center gap-2 hover:bg-gray-50">
            <span>View Menu</span>
            <span className="text-xl">🍽️</span>
          </button>

          {cartCount > 0 && (
            <Link href={`/r/${slug}/${qrToken}/cart`}
              className="w-full bg-[#132A1E] border-2 border-white/15 text-white py-3.5 rounded-2xl
                font-semibold text-sm flex items-center justify-center gap-2
                active:scale-[0.98] transition-all hover:border-white/25">
              <ShoppingCart className="h-4 w-4" />
              View Cart ({cartCount} item{cartCount > 1 ? "s" : ""})
            </Link>
          )}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-20 right-5 flex flex-col items-center gap-0.5 opacity-20 pointer-events-none animate-bounce">
          <span className="text-white text-[9px] uppercase tracking-widest rotate-90 translate-y-2">Scroll</span>
          <ChevronDown className="h-3.5 w-3.5 text-white mt-1" />
        </div>

        {/* CSS keyframes */}
        <style jsx global>{`
          @keyframes blobPulse  { 0%,100%{transform:scale(1) translate(0,0)}   50%{transform:scale(1.12) translate(20px,-15px)} }
          @keyframes lightStreak{ 0%,100%{transform:translateX(-100%)} 50%{transform:translateX(100%)} }
          @keyframes floatP0 { 0%,100%{transform:translateY(0) rotate(-25deg)} 55%{transform:translateY(-14px) rotate(-20deg)} }
          @keyframes floatP1 { 0%,100%{transform:translateY(0) rotate(8deg)}   45%{transform:translateY(-9px)  rotate(12deg)}  }
          @keyframes floatP2 { 0%,100%{transform:translateY(0) rotate(-5deg)}  65%{transform:translateY(-16px) rotate(-1deg)}  }
          @keyframes floatP3 { 0%,100%{transform:translateY(0) rotate(15deg)}  40%{transform:translateY(-11px) rotate(19deg)}  }
          @keyframes floatP4 { 0%,100%{transform:translateY(0) rotate(-12deg)} 70%{transform:translateY(-8px)  rotate(-8deg)}  }
        `}</style>
      </section>

      {/* ── SECTION 2: Why scan / features strip ───────────────────────────── */}
      <section className="snap-start min-h-screen bg-[#FBF7F1] flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-8 w-full max-w-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Why order with us</p>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Georgia,serif" }}>
            Order your way
          </h2>
        </div>

        <div className="w-full max-w-sm space-y-3.5">
          {[
            { icon:"⚡", title:"Instant Ordering",    desc:"Browse, add to cart and place your order in under 60 seconds. No app needed." },
            { icon:"📱", title:"Mobile First",         desc:"Designed for your phone. Big buttons, fast loading, beautiful experience."    },
            { icon:"🔄", title:"Order Again Anytime",  desc:"Add more dishes to your order anytime during your meal."                     },
            { icon:"🔔", title:"Request Staff Anytime",desc:"Need water, extra cutlery, or to pay the bill? One tap away."                },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm border border-black/5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-3xl flex-shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="font-bold text-gray-900 mb-0.5">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onEnterMenu}
          className="mt-8 w-full max-w-sm bg-[#132A1E] text-white py-4 rounded-2xl font-bold text-base
            active:scale-[0.98] transition-all shadow-lg shadow-[#132A1E]/20">
          Let's Order 🍽️
        </button>
      </section>
    </div>
  );
}
