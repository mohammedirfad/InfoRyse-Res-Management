"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ChevronDown,
  Sparkles,
  UtensilsCrossed,
  BellRing,
  ArrowRight,
  Flame,
  Clock,
  Heart,
  ChefHat,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getDishImageUrl } from "@/lib/dishImages";

type FoodItem = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  isVeg: boolean;
  categoryName?: string;
  isBestseller?: boolean;
  isPopular?: boolean;
  isChefsPick?: boolean;
  isTodaySpecial?: boolean;
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
  const { t, tDish } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [likedDishes, setLikedDishes] = useState<Record<string, boolean>>({});

  const heroImages = useMemo(
    () => featuredItems.slice(0, 5).map((item) => getDishImageUrl(item.name, item.categoryName, item.imageUrl)),
    [featuredItems]
  );
  const displayItems = featuredItems.length > 0 ? featuredItems.slice(0, 6) : [];
  const highlightItems = featuredItems.slice(0, 4);
  const itemBadge = (item: FoodItem) =>
    item.isBestseller ? "Bestseller" :
    item.isPopular ? "Popular" :
    item.isChefsPick ? "Chef's Pick" :
    item.isTodaySpecial ? "Today's Special" : "Guest favourite";

  useEffect(() => {
    if (displayItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % displayItems.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [displayItems.length]);

  const currentItem = displayItems[activeSlide] || null;

  return (
    <div
      className="min-h-screen overflow-x-hidden select-none bg-[#06120c] text-white"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ── HERO VIEWPORT: Full-Screen Luxury Experience ────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-between overflow-hidden px-5 py-6">
        
        {/* Animated Background Food Photography with Ken Burns Cinematic Zoom */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={heroImages[0] ?? "menu-background"}
              initial={{ opacity: 0, scale: 1.15 }}
              animate={{ opacity: 0.42, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={heroImages[0] ? { backgroundImage: `url(${heroImages[0]})` } : undefined}
            />
          </AnimatePresence>

          {/* Luxury dark emerald vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 25%, rgba(13, 38, 26, 0.75) 0%, rgba(9, 26, 18, 0.92) 60%, rgba(4, 12, 8, 0.98) 100%)",
            }}
          />

          {/* Ambient light glow */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-emerald-500/25 blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 -right-28 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none"
          />
        </div>

        {/* ── TOP BAR: Table Pill, Kitchen Status & Language Selector ────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-20 flex items-center justify-between w-full pt-1"
        >
          {/* Table Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-white text-xs font-bold tracking-wide">
              {t("table", "Table")} <span className="text-amber-400 font-extrabold">{tableLabel}</span>
            </span>
          </div>

          {/* Right Controls: Kitchen Active + Instant Language Selector */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-white/80">
              <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>{isOpen ? t("kitchenActive", "Kitchen Active") : t("closed", "Closed")}</span>
            </div>

            {/* Zero-delay language switcher pill */}
            <LanguageSelector variant="pill" />
          </div>
        </motion.header>

        {/* ── CENTER: Brand Identity & Animated Showcase ────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto max-w-sm mx-auto w-full">
          
          {/* Restaurant Brand Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mb-3 group"
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 via-emerald-600/30 to-amber-500/20 border border-amber-400/40 backdrop-blur-xl flex items-center justify-center shadow-xl shadow-black/40">
                <UtensilsCrossed className="w-8 h-8 text-amber-300" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              QR
            </div>
          </motion.div>

          {/* Restaurant Name */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white font-black tracking-tight text-3xl md:text-4xl leading-tight mb-2"
            style={{ textShadow: "0 2px 25px rgba(0,0,0,0.8)" }}
          >
            {restaurantName}
          </motion.h1>

          {/* Active Promo Campaign Banner (if enabled) */}
          {discountActive && (discountPercent ?? 0) > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="w-full rounded-2xl px-4 py-2 bg-gradient-to-r from-emerald-500/30 via-teal-400/25 to-emerald-500/30 border border-emerald-400/40 flex items-center justify-center gap-2 mb-4 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
              <span className="text-emerald-200 text-xs font-extrabold tracking-wide">
                {discountName || t("specialOffer", "Special Festive Offer")}: {t("flatDiscount", "Flat")} {discountPercent}% {t("offApplied", "OFF applied!")}
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-semibold mb-4"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t("dineIn", "Dine In")} · {t("fastKitchen", "Fast Kitchen")}</span>
            </motion.div>
          )}

          {/* ── INTERACTIVE FEATURED DISH SHOWCASE (Hero Card) ───────────────── */}
          {currentItem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onClick={onEnterMenu}
              className="relative w-full rounded-3xl p-3.5 bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.6)] cursor-pointer group hover:border-amber-400/50 transition-all mb-4"
            >
              <div className="flex items-center gap-3.5">
                {/* Food Image with Veg Badge & Zoom on hover */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 border border-white/15">
                  <motion.img
                    key={currentItem.id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    src={getDishImageUrl(currentItem.name, currentItem.categoryName, currentItem.imageUrl)}
                    alt={currentItem.name}
                    className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500"
                  />

                  {/* Veg/Non-Veg Dot */}
                  <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs p-1 rounded-md">
                    <span
                      className={`w-2.5 h-2.5 rounded-xs border-2 flex items-center justify-center ${
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
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {t("chefsSpecial", "Chef's Special")}
                    </span>
                  </div>

                  <h3 className="text-white font-extrabold text-sm truncate leading-snug">
                    {tDish(currentItem.name)}
                  </h3>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-amber-400 font-black text-sm">
                      {formatRupees(currentItem.priceCents)}
                    </span>
                    <span className="text-white/50 text-[11px] group-hover:text-amber-300 flex items-center gap-0.5 transition-colors font-semibold">
                      {t("add", "ADD")} +
                    </span>
                  </div>
                </div>
              </div>

              {/* Slider Dots */}
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

          {/* Quick Menu Stats Strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="grid grid-cols-3 gap-2 w-full mb-3"
          >
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center">
              <p className="text-white font-black text-lg leading-tight">{totalItems}</p>
              <p className="text-white/45 text-[10px] uppercase tracking-wider font-bold">
                {t("dishes", "Dishes")}
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center">
              <p className="text-white font-black text-lg leading-tight">{categories}</p>
              <p className="text-white/45 text-[10px] uppercase tracking-wider font-bold">
                {t("sections", "Sections")}
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl py-2 px-1 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-amber-400 font-black text-base leading-tight">
                <Clock className="w-3.5 h-3.5" /> 15m
              </div>
              <p className="text-white/45 text-[10px] uppercase tracking-wider font-bold">
                {t("fastKitchen", "Fast Kitchen")}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── BOTTOM ACTION BAR ──────────────────────────────────────────────── */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-20 w-full max-w-sm mx-auto space-y-2.5 pt-1"
        >
          {/* Main Action: Explore Menu Button with Shimmer Border */}
          <button
            onClick={onEnterMenu}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 p-[1.5px] shadow-[0_10px_35px_rgba(212,169,76,0.4)] active:scale-[0.98] transition-transform"
          >
            <div className="relative w-full bg-gradient-to-r from-[#0d281a] via-[#143e28] to-[#0d281a] text-white py-4 px-6 rounded-2xl flex items-center justify-between font-extrabold text-base transition-all group-hover:bg-opacity-90">
              <span className="flex items-center gap-2.5">
                <span className="text-xl">🍽️</span>
                <span>{t("exploreMenu", "Explore Full Menu")}</span>
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-400 text-gray-950 flex items-center justify-center font-bold shadow-md group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </button>

          {/* Cart Bar if Items Exist */}
          {cartCount > 0 && (
            <Link
              href={`/r/${slug}/${qrToken}/cart`}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-between backdrop-blur-xl active:scale-[0.98] transition-all shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-amber-300" />
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {cartCount}
                  </span>
                </div>
                <span>{t("viewTableCart", "View Table Cart")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-sm">
                {cartTotalCents > 0 && <span>{formatRupees(cartTotalCents)}</span>}
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          )}

          {/* Quick Staff Assistance Button */}
          {onOpenAssist && (
            <button
              onClick={onOpenAssist}
              className="w-full flex items-center justify-center gap-2 text-white/60 hover:text-white text-xs font-semibold py-1.5 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("needAssistance", "Need water, extra cutlery or waiter? Tap here")}</span>
            </button>
          )}
        </motion.footer>

        {/* Scroll Cue */}
        <div className="flex flex-col items-center justify-center pt-2 text-white/30 text-[10px] uppercase tracking-widest pointer-events-none animate-bounce">
          <ChevronDown className="w-4 h-4 mt-0.5" />
        </div>
      </section>

      {/* ── SECTION 2: Signature Culinary Gallery (Scroll Animation) ────────── */}
      <section className="relative min-h-screen bg-[#081811] py-14 px-5 border-t border-white/5">
        <div className="max-w-md mx-auto space-y-8">
          
          <div className="text-center space-y-1.5">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block text-[10px] font-black tracking-widest text-amber-300 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20"
            >
              Signature Highlights
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-black text-white"
            >
              Crafted With Passion
            </motion.h2>
          </div>

          {/* Animated 2x2 Visual Cards Grid with Ken Burns Image Transitions */}
          <div className="grid grid-cols-2 gap-3.5">
            {highlightItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onClick={onEnterMenu}
                className="group relative rounded-3xl overflow-hidden bg-white/[0.05] border border-white/10 p-2.5 cursor-pointer hover:border-amber-400/40 transition-all shadow-lg"
              >
                {/* Image Container with Zoom effect */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/60 mb-2.5">
                  <img
                    src={getDishImageUrl(item.name, item.categoryName, item.imageUrl)}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-300 border border-white/10">
                    {itemBadge(item)}
                  </div>

                  {/* Veg Indicator */}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs p-1 rounded-md">
                    <span
                      className={`w-2 h-2 rounded-xs border-2 flex items-center justify-center ${
                        item.isVeg ? "border-green-400" : "border-rose-400"
                      }`}
                    >
                      <span
                        className={`w-0.5 h-0.5 rounded-full ${
                          item.isVeg ? "bg-green-400" : "bg-rose-400"
                        }`}
                      />
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="px-1 pb-1">
                  <h4 className="text-white font-extrabold text-xs truncate group-hover:text-amber-300 transition-colors">
                    {tDish(item.name)}
                  </h4>
                  <p className="text-white/40 text-[10px] mt-0.5 font-medium">
                    {item.categoryName ?? "Menu highlight"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[
              { icon: "⚡", title: "Instant Kitchen", sub: "Direct Dispatch" },
              { icon: "📱", title: "Contactless", sub: "Easy QR Tab" },
              { icon: "🧾", title: "Live Bill", sub: "Shared Table Tab" },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-center"
              >
                <div className="text-xl mb-1">{p.icon}</div>
                <p className="text-white font-bold text-xs">{p.title}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{p.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom Action CTA */}
          <div className="pt-2">
            <button
              onClick={onEnterMenu}
              className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-gray-950 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{t("viewMenuAndOrder", "View Full Menu & Order")}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
