"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatRupees, type MenuItem } from "@/components/CartContext";

type FeaturedItem = MenuItem & { categoryName: string };
type Props = {
  items: FeaturedItem[];
  restaurantName: string;
  categoryName: string;
  justAdded: string | null;
  onSelect: (item: MenuItem) => void;
  onAdd: (item: MenuItem, event: React.MouseEvent) => void;
};

const gradients = ["from-amber-100 to-orange-200", "from-rose-100 to-pink-200", "from-sky-100 to-indigo-200", "from-emerald-100 to-teal-200"];
function badge(item: MenuItem) {
  if (item.isBestseller) return { label: "Bestseller", style: "bg-amber-500 text-white" };
  if (item.isPopular) return { label: "Popular", style: "bg-rose-600 text-white" };
  if (item.isChefsPick) return { label: "Chef's Pick", style: "bg-sky-700 text-white" };
  if (item.isTodaySpecial) return { label: "Today's Special", style: "bg-emerald-700 text-white" };
  return null;
}

export default function GuestFeaturedCarousel({ items, restaurantName, categoryName, justAdded, onSelect, onAdd }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [frozen, setFrozen] = useState(false);
  useEffect(() => { setActiveIndex((index) => Math.min(index, Math.max(0, items.length - 1))); }, [items.length]);
  useEffect(() => {
    if (frozen || items.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % items.length), 3500);
    return () => window.clearInterval(timer);
  }, [frozen, items.length]);
  function selectIndex(index: number) {
    setActiveIndex(index);
    setFrozen(true);
    window.setTimeout(() => setFrozen(false), 5000);
  }

  if (!items.length) return null;
  const active = items[activeIndex];
  return (
    <section className="pt-4 pb-2">
      <div className="text-center mb-3 px-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest">{restaurantName}</p>
        <p className="text-sm text-gray-500">{categoryName}</p>
      </div>
      <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 260 }}>
        {items.map((item, index) => {
          const offset = index - activeIndex;
          const distance = Math.abs(offset);
          const isCenter = offset === 0;
          const hidden = distance > 2;
          return (
            <button key={item.id} type="button" aria-label={isCenter ? `View ${item.name}` : `Show ${item.name}`}
              onClick={() => isCenter ? onSelect(item) : selectIndex(index)}
              style={{ position: "absolute", width: isCenter ? 200 : 130, height: isCenter ? 200 : 130, left: "50%", transform: `translateX(calc(-50% + ${offset * 155}px)) scale(${isCenter ? 1 : 0.85})`, opacity: hidden ? 0 : isCenter ? 1 : 0.6, zIndex: 10 - distance, transition: "all 0.45s cubic-bezier(0.25,0.46,0.45,0.94)", pointerEvents: hidden ? "none" : "auto" }}
              className="cursor-pointer rounded-2xl text-left">
              <span className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} shadow-xl`}>
                <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true">🍽️</span>
                {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill sizes="200px" priority={index === activeIndex} className="relative z-10 object-cover" />}
                {badge(item) && <span className={`absolute left-2 top-2 z-20 rounded-full px-2.5 py-1 text-[9px] font-black shadow ${badge(item)!.style}`}>{badge(item)!.label}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {active && <div className="text-center px-8 mt-2 min-h-[72px]">
        {badge(active) && <span className={`mb-1 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${badge(active)!.style}`}>{badge(active)!.label}</span>}
        <p className="font-bold text-gray-900 text-base leading-snug">{active.name}</p>
        {active.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{active.description}</p>}
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="font-bold text-gray-900">{formatRupees(active.priceCents)}</span>
          <button onClick={(event) => onAdd(active, event)} className={`text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-all active:scale-90 ${justAdded === active.id ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-900 border-gray-900 hover:bg-gray-900 hover:text-white"}`}>
            {justAdded === active.id ? "Added ✓" : "Add to cart"}
          </button>
        </div>
      </div>}
      <div className="flex justify-center gap-1.5 mt-3" aria-label="Featured items">
        {items.map((item, index) => <button key={item.id} type="button" aria-label={`Show ${item.name}`} onClick={() => selectIndex(index)} className={`rounded-full transition-all ${index === activeIndex ? "w-5 h-1.5 bg-gray-900" : "w-1.5 h-1.5 bg-gray-200"}`} />)}
      </div>
    </section>
  );
}
