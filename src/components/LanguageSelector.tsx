"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage, LANGUAGES, SupportedLanguage } from "@/lib/i18n";

export function LanguageSelector({
  variant = "pill",
}: {
  variant?: "pill" | "compact" | "floating";
}) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 transition-all active:scale-95 ${
          variant === "pill"
            ? "px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md text-xs font-semibold shadow-xs"
            : variant === "compact"
            ? "px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold"
            : "px-3 py-2 rounded-2xl bg-gray-900/90 text-white shadow-xl backdrop-blur-md text-xs font-bold border border-white/10"
        }`}
        aria-label="Select Language"
      >
        <Globe className="w-3.5 h-3.5 opacity-80" />
        <span className="font-medium tracking-tight">
          {current.nativeName}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-[#0f241a]/95 backdrop-blur-xl border border-white/20 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-white/10 text-[10px] uppercase tracking-widest font-extrabold text-amber-300">
            Select Language
          </div>
          <div className="space-y-0.5 p-1">
            {LANGUAGES.map((item) => {
              const active = item.code === language;
              return (
                <button
                  key={item.code}
                  onClick={() => {
                    setLanguage(item.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    active
                      ? "bg-amber-400 text-gray-950 font-bold shadow-xs"
                      : "text-white/80 hover:bg-white/10 hover:text-white font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{item.nativeName}</span>
                      <span className={`text-[10px] ${active ? "text-gray-800 font-semibold" : "text-white/40"}`}>
                        {item.name}
                      </span>
                    </div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
