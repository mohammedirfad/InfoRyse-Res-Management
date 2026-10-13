"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ChevronDown,
  Sparkles,
  Clock,
  UtensilsCrossed,
  BellRing,
  ShieldCheck,
  ChevronRight,
  Flame,
  ArrowRight,
} from "lucide-react";

type FoodItem = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  isVeg: boolean;
};

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
  cartTotalCents?: number;
  slug:            string;
  qrToken:         string;
  discountActive?: boolean;
  discountPercent?: number;
  discountName?:   string;
  onEnterMenu:     () => void;
  onOpenAssist?:   () => void;
}

const HERO_BG_IMAGES = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=1200&auto=format&fit=crop&q=80",
];

const FOOD_EMOJIS = ["🍕", "🍔", "🍜", "🍛", "🥗", "🍱", "🥞", "🍰", "🥤", "🍸", "🫕", "🥩", "🥘", "🍲", "🧆"];

function formatRupees(c: number) {
  return `₹${(c / 100).toFixed(0)}`;
}

export function LandingPage({
  restaurantName,
  restaurantLogo,
  tableLabel,
  isOccupied,
  isOpen,
  featuredItems,
  totalItems,
  categories,
  cartCount,
  cartTotalCents = 0,
  slug,
  qrToken,
  discountActive,
  discountPercent,
  discountName,
  onEnterMenu,
  onOpenAssist,
}: LandingProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused]       = useState(false);
  const [bgIndex, setBgIndex]         = useState(0);
  const [imgErrors, setImgErrors]     = useState<Record<string, boolean>>({});
  const containerRef                  = useRef<HTMLDivElement>(null);

  // Background food photography cinematic slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % HERO_BG_IMAGES.length);
    }, 4600);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance featured dishes showcase
  const displayItems = featuredItems.length > 0 ? featuredItems.slice(0, 5) : [];

  useEffect(() => {
    if (displayItems.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % displayItems.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [displayItems.length, isPaused]);

  const currentItem = displayItems[activeSlide] || null;

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory select-none bg-[#071510]"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ── SECTION 1: Full-Screen Luxury Hero ────────────────────────────────── */}
      <section className="snap-start relative min-h-screen flex flex-col justify-between overflow-hidden px-5 py-6">
        {/* Animated Background Food Images with Cinematic Ken Burns Transitions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={bgIndex}
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 0.38, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_BG_IMAGES[bgIndex]})` }}
            />
          </AnimatePresence>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 20%, rgba(19, 42, 30, 0.72) 0%, rgba(13, 36, 23, 0.9) 55%, rgba(5, 13, 9, 0.98) 100%)",
            }}
          />
        </div>
        {/* Dynamic ambient glow & light streaks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.15, 0.28, 0.15],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.1, 0.9, 1.1],
              opacity: [0.12, 0.22, 0.12],
            }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl"
          />
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(rgba(212, 169, 76, 0.15) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {FOOD_EMOJIS.slice(0, 8).map((emoji, i) => (
            <motion.div
              key={i}
              className="absolute text-xl md:text-2xl opacity-15"
              style={{
                left: `${10 + (i * 12) % 80}%`,
                top: `${8 + (i * 14) % 80}%`,
              }}
              animate={{
                y: [0, -18, 0],
                rotate: [0, (i % 2 === 0 ? 15 : -15), 0],
              }}
              transition={{
                duration: 5 + (i % 4),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.4,
              }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>

        {/* ── TOP BAR: Table Pill & Live Status ──────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-20 flex items-center justify-between w-full pt-1"
        >
          {/* Table Indicator Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-white text-xs font-semibold tracking-wide">
              Table <span className="text-amber-400 font-bold">{tableLabel}</span>
            </span>
          </div>

          {/* Kitchen / Open status */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                isOpen ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-400"
              }`}
            />
            <span className="text-white/80 text-xs font-medium">
              {isOpen ? "Kitchen Active" : "Closed"}
            </span>
          </div>
        </motion.header>

        {/* ── CENTER: Brand Identity & Animated Showcase ────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-3 max-w-sm mx-auto w-full">
          {/* Restaurant Logo / Shield */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mb-3"
          >
            {restaurantLogo ? (
              <div className="relative w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-amber-200 to-emerald-400 shadow-2xl">
                <img
                  src={restaurantLogo}
                  alt={restaurantName}
                  className="w-full h-full object-cover rounded-xl bg-black"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-400/20 border border-amber-400/40 backdrop-blur-xl flex items-center justify-center shadow-xl">
                <UtensilsCrossed className="w-8 h-8 text-amber-300" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow">
              QR
            </div>
          </motion.div>

          {/* Restaurant Name */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white font-extrabold tracking-tight mb-1 text-3xl md:text-4xl"
            style={{
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "-0.03em",
              textShadow: "0 2px 20px rgba(0,0,0,0.6)",
            }}
          >
            {restaurantName}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-white/60 text-xs font-medium tracking-wide mb-4 flex items-center gap-1.5"
          >
            <span>Handcrafted Flavours</span>
            <span className="text-amber-400/70">✦</span>
            <span>Contactless Dining</span>
          </motion.p>

          {/* ── INTERACTIVE FEATURED DISH SHOWCASE CAROUSEL ─────────────────── */}
          {displayItems.length > 0 && currentItem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onClick={onEnterMenu}
              className="relative w-full rounded-3xl p-3 bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.5)] cursor-pointer group hover:border-amber-400/40 transition-all mb-4"
            >
              <div className="flex items-center gap-3.5">
                {/* Food Image with Veg Badge */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentItem.id}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-full"
                    >
                      {currentItem.imageUrl && !imgErrors[currentItem.id] ? (
                        <img
                          src={currentItem.imageUrl}
                          alt={currentItem.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={() =>
                            setImgErrors((prev) => ({ ...prev, [currentItem.id]: true }))
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-amber-900/60 to-emerald-950/60">
                          {FOOD_EMOJIS[activeSlide % FOOD_EMOJIS.length]}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Veg/Non-Veg Dot */}
                  <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm p-1 rounded-md">
                    <span
                      className={`w-2.5 h-2.5 rounded-sm border-2 flex items-center justify-center ${
                        currentItem.isVeg ? "border-green-400" : "border-rose-400"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          currentItem.isVeg ? "bg-green-400" : "bg-rose-400"
                        }`}
                      />
                    </span>
                  </div>
                </div>

                {/* Dish Info */}
                <div className="flex-1 text-left min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> Chef's Special
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentItem.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-white font-bold text-sm truncate leading-snug">
                        {currentItem.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-amber-400 font-extrabold text-sm">
                          {formatRupees(currentItem.priceCents)}
                        </span>
                        <span className="text-white/40 text-[11px] group-hover:text-white flex items-center gap-0.5 transition-colors">
                          Tap to view <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Slider dots */}
              {displayItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                  {displayItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide(i);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeSlide ? "w-6 bg-amber-400" : "w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STATS BADGES: Dishes, Categories, Speed ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="grid grid-cols-3 gap-2 w-full mb-3"
          >
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center">
              <p className="text-white font-black text-lg leading-tight">{totalItems}</p>
              <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">
                Dishes
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center">
              <p className="text-white font-black text-lg leading-tight">{categories}</p>
              <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">
                Sections
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-amber-400 font-black text-base leading-tight">
                <Clock className="w-3.5 h-3.5" /> 15m
              </div>
              <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">
                Fast Kitchen
              </p>
            </div>
          </motion.div>

          {/* Dynamic Campaign Discount or Clean Dining Badge */}
          {discountActive && (discountPercent ?? 0) > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full rounded-2xl px-3.5 py-2.5 bg-gradient-to-r from-emerald-500/25 via-teal-400/20 to-emerald-500/25 border border-emerald-400/35 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span className="text-emerald-200 text-xs font-bold">
                {discountName || "Special Festive Offer"}: Flat {discountPercent}% OFF applied!
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full rounded-2xl px-3.5 py-2 bg-white/[0.05] border border-white/10 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-white/70 text-xs font-semibold">
                Dine In · Contactless QR Menu & Ordering
              </span>
            </motion.div>
          )}
        </div>

        {/* ── NOT OCCUPIED NOTICE ────────────────────────────────────────────── */}
        {!isOccupied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20 w-full max-w-sm mx-auto mb-2.5"
          >
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-amber-200 text-xs font-medium">
              <span className="text-base">🪑</span>
              <span>Please ask our service staff to seat your party before ordering.</span>
            </div>
          </motion.div>
        )}

        {/* ── BOTTOM ACTION BAR ──────────────────────────────────────────────── */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="relative z-20 w-full max-w-sm mx-auto space-y-2.5 pt-1"
        >
          {/* Main Action: Explore Menu */}
          <button
            onClick={onEnterMenu}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 p-[1px] shadow-[0_8px_30px_rgba(212,169,76,0.35)] active:scale-[0.98] transition-transform"
          >
            <div className="relative w-full bg-gradient-to-r from-[#0d281a] via-[#123824] to-[#0d281a] text-white py-4 px-6 rounded-2xl flex items-center justify-between font-bold text-base group-hover:bg-opacity-90 transition-all">
              <span className="flex items-center gap-2.5">
                <span className="text-lg">🍽️</span>
                <span>Explore Full Menu</span>
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-sm shadow-md group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Cart button if items exist */}
          {cartCount > 0 && (
            <Link
              href={`/r/${slug}/${qrToken}/cart`}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-between backdrop-blur-xl active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-amber-300" />
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {cartCount}
                  </span>
                </div>
                <span>View Table Cart</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-sm">
                {cartTotalCents > 0 && <span>{formatRupees(cartTotalCents)}</span>}
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          {/* Quick Staff Assistance Button */}
          {onOpenAssist && (
            <button
              onClick={onOpenAssist}
              className="w-full flex items-center justify-center gap-2 text-white/50 hover:text-white/90 text-xs font-semibold py-1.5 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Need water, extra cutlery or waiter? Tap here</span>
            </button>
          )}
        </motion.footer>

        {/* Scroll cue */}
        <div className="flex flex-col items-center justify-center pt-2 text-white/30 text-[10px] uppercase tracking-widest pointer-events-none animate-bounce">
          <span>Scroll to explore perks</span>
          <ChevronDown className="w-3.5 h-3.5 mt-0.5" />
        </div>
      </section>

      {/* ── SECTION 2: Why Digital Table Ordering (Scroll Animation) ───────── */}
      <section className="snap-start min-h-screen bg-[#FBF7F1] text-gray-900 flex flex-col justify-center px-6 py-12">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="text-center">
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Seamless Dining
            </span>
            <h2
              className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-2.5 mb-1"
              style={{ letterSpacing: "-0.02em" }}
            >
              How Ordering Works
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed">
              Order directly from your phone — no apps, no waiting, 100% synchronized table.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              {
                icon: "⚡",
                title: "Instant Kitchen Dispatch",
                desc: "Your order is sent straight to the chef's screen with zero delay.",
              },
              {
                icon: "🔄",
                title: "Order Rounds Anytime",
                desc: "Want extra drinks or hot desserts? Add more dishes throughout your meal.",
              },
              {
                icon: "🔔",
                title: "One-Tap Waiter Call",
                desc: "Tap assistance anytime for fresh water, napkins, cutlery or billing.",
              },
              {
                icon: "🧾",
                title: "Consolidated Table Bill",
                desc: "All orders placed at Table " + tableLabel + " merge into a single unified tab.",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-4 flex items-start gap-3.5 border border-black/5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-2xl flex items-center justify-center flex-shrink-0">
                  {card.icon}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-0.5">{card.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={onEnterMenu}
              className="w-full bg-[#0d281a] text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-[#0d281a]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-[#123824]"
            >
              <span>View Full Menu & Order</span>
              <span className="text-lg">🍽️</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
