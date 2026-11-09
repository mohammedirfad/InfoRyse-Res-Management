"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { formatRupees } from "@/lib/utils";
import { invalidateCache } from "@/lib/cachedFetch";

type Category = { id: string; name: string };
type MenuDish = { id: string; name: string; priceCents: number; description?: string | null; isVeg?: boolean; isAvailable?: boolean; category: Category };
type Line = { itemId: string; qty: number; name: string; price: number };

export default function OrderMenuPicker({ open, onClose, items, categories, lines, onLinesChange, onDishCreated, onCategoryCreated }: {
  open: boolean; onClose: () => void; items: MenuDish[]; categories: Category[]; lines: Line[];
  onLinesChange: (lines: Line[]) => void; onDishCreated: (item: MenuDish) => void;
  onCategoryCreated: (category: Category) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [dishCategoryId, setDishCategoryId] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => items.filter((item) => item.isAvailable !== false && (categoryId === "all" || item.category.id === categoryId) && (!search.trim() || `${item.name} ${item.description ?? ""} ${item.category.name}`.toLowerCase().includes(search.trim().toLowerCase()))), [items, categoryId, search]);
  if (!open) return null;

  function changeQty(item: MenuDish, delta: number) {
    const current = lines.find((line) => line.itemId === item.id);
    const nextQty = (current?.qty ?? 0) + delta;
    onLinesChange(nextQty <= 0 ? lines.filter((line) => line.itemId !== item.id) : current ? lines.map((line) => line.itemId === item.id ? { ...line, qty: nextQty } : line) : [...lines, { itemId: item.id, qty: 1, name: item.name, price: item.priceCents }]);
  }

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setError(null);
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
    const data = await response.json();
    if (!response.ok || !data.category) { setError(data.error ?? "Could not create category."); return; }
    onCategoryCreated(data.category); setDishCategoryId(data.category.id); setNewCategory(""); invalidateCache("admin:/api/admin/categories");
  }

  async function createDish(event: FormEvent) {
    event.preventDefault(); setError(null);
    const parsedPrice = Number(price);
    if (!name.trim() || !dishCategoryId || !Number.isFinite(parsedPrice) || parsedPrice < 0) { setError("Enter a dish name, category, and valid price."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/menu-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim() || null, categoryId: dishCategoryId, priceCents: Math.round(parsedPrice * 100), isVeg, isAvailable: true }) });
      const data = await response.json();
      if (!response.ok || !data.item) { setError(data.error ?? "Could not add dish."); return; }
      const category = categories.find((entry) => entry.id === dishCategoryId);
      const dish = { ...data.item, category } as MenuDish;
      onDishCreated(dish); changeQty(dish, 1); invalidateCache("admin:/api/admin/menu-items");
      setName(""); setDescription(""); setPrice(""); setAdding(false);
    } catch { setError("Could not add dish. Please try again."); }
    finally { setSaving(false); }
  }

  async function addNewCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setError(null);
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
    const data = await response.json();
    if (!response.ok || !data.category) { setError(data.error ?? "Could not create category."); return; }
    onCategoryCreated(data.category); setDishCategoryId(data.category.id); setNewCategory(""); invalidateCache("admin:/api/admin/categories");
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="order-menu-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5"><div><h2 id="order-menu-title" className="text-lg font-extrabold text-slate-900">Choose menu items</h2><p className="mt-0.5 text-xs text-slate-500">Search all categories or add a new dish to the menu.</p></div><button type="button" onClick={onClose} aria-label="Close menu picker" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dish, description, or category" className="input w-full pl-9" /></div><button type="button" onClick={() => { setAdding((current) => !current); setError(null); setDishCategoryId(categories[0]?.id ?? ""); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add new dish</button></div>
          <div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setCategoryId("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${categoryId === "all" ? "bg-emerald-950 text-white" : "border border-slate-200 text-slate-600"}`}>All categories</button>{categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${categoryId === category.id ? "bg-emerald-950 text-white" : "border border-slate-200 text-slate-600"}`}>{category.name}</button>)}</div>
        </div>
        {adding && <form onSubmit={createDish} className="grid gap-2 border-b border-amber-100 bg-amber-50/60 p-4 sm:grid-cols-2"><div className="sm:col-span-2 flex items-center justify-between"><strong className="text-sm text-slate-800">Add a dish to your menu</strong><button type="button" onClick={() => setAdding(false)} aria-label="Close add dish form" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button></div><input required className="input" placeholder="Dish name" value={name} onChange={(event) => setName(event.target.value)} /><input required min="0" step="0.01" type="number" className="input" placeholder="Price (₹)" value={price} onChange={(event) => setPrice(event.target.value)} /><select required className="input" value={dishCategoryId} onChange={(event) => setDishCategoryId(event.target.value)}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className="flex gap-1"><input className="input min-w-0 flex-1 bg-white" placeholder="New category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><button type="button" onClick={() => void addNewCategory()} className="rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold">Add</button></div><div className="flex gap-2"><button type="button" onClick={() => setIsVeg((current) => !current)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold">{isVeg ? "● Vegetarian" : "● Non-vegetarian"}</button></div><textarea className="input resize-none sm:col-span-2" rows={2} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="flex justify-end sm:col-span-2"><button disabled={saving} className="rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save dish and add to order"}</button></div></form>}
        {error && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
        <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="grid gap-2 sm:grid-cols-2">{visible.map((item) => { const qty = lines.find((line) => line.itemId === item.id)?.qty ?? 0; return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.name}</p><p className="truncate text-xs text-slate-500">{item.category.name}{item.isVeg === false ? " · Non-veg" : " · Veg"}</p><p className="mt-1 text-xs font-bold text-emerald-900">{formatRupees(item.priceCents)}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item, -1)} disabled={!qty} className="h-9 w-9 rounded-lg border border-slate-200 font-bold disabled:opacity-40">−</button><span className="min-w-5 text-center text-sm font-bold">{qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item, 1)} className="h-9 w-9 rounded-lg bg-emerald-950 font-bold text-white">+</button></div></div>; })}</div>{visible.length === 0 && <div className="py-12 text-center text-sm text-slate-500">No available dishes match. Try another category or add a new dish.</div>}</div>
        <footer className="flex items-center justify-between border-t border-slate-200 p-4"><p className="text-xs text-slate-600">{lines.reduce((sum, line) => sum + line.qty, 0)} item(s) selected</p><button type="button" onClick={onClose} className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-bold text-white">Done</button></footer>
      </section>
    </div>
  );
}
