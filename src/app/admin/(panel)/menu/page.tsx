"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, Search, X, Pencil, Trash2, Star, Flame, ChefHat, Sparkles } from "lucide-react";
import { formatRupees } from "@/lib/utils";
import ImageUpload from "@/components/ImageUpload";

type Category = { id: string; name: string };
type MenuItem = {
  id: string; name: string; description?: string; priceCents: number;
  isAvailable: boolean; isVeg: boolean; category: Category; imageUrl?: string;
  isBestseller?: boolean; isPopular?: boolean; isChefsPick?: boolean; isTodaySpecial?: boolean;
};

type EditForm = {
  name: string; price: string; categoryId: string; isVeg: boolean; description: string;
  isAvailable: boolean; isBestseller: boolean; isPopular: boolean; isChefsPick: boolean;
  isTodaySpecial: boolean; imageUrl: string;
};

const BLANK_FORM: EditForm = {
  name: "", price: "", categoryId: "", isVeg: true, description: "",
  isAvailable: true, isBestseller: false, isPopular: false, isChefsPick: false,
  isTodaySpecial: false, imageUrl: "",
};

const FOOD_EMOJIS_BY_CAT: Record<string, string> = {
  breakfast: "🥞", starters: "🥗", "main course": "🍛", beverages: "🥤",
  desserts: "🍰", snacks: "🍿", lunch: "🍱", dinner: "🍽️",
};

function catEmoji(name: string) {
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(FOOD_EMOJIS_BY_CAT)) if (n.includes(k)) return v;
  return "🍽️";
}

export default function MenuManagementPage() {
  const [items, setItems]               = useState<MenuItem[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch]             = useState("");
  const [viewMode, setViewMode]         = useState<"grid" | "list">("grid");
  const [editItem, setEditItem]         = useState<MenuItem | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [form, setForm]                 = useState<EditForm>({
    ...BLANK_FORM,
    imageUrl: "",
  });
  const [newCatName, setNewCatName]     = useState("");

  async function load() {
    try {
      const [ir, cr] = await Promise.all([
        fetch("/api/admin/menu-items", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
      ]);
      const itemsData = (await ir.json()).items ?? [];
      const catsData  = (await cr.json()).categories ?? [];
      setItems(itemsData);
      setCategories(catsData);
      try {
        sessionStorage.setItem("inforyse_admin_items", JSON.stringify(itemsData));
        sessionStorage.setItem("inforyse_admin_cats", JSON.stringify(catsData));
      } catch { /* ignore */ }
      if (!form.categoryId && catsData[0]) setForm((f) => ({ ...f, categoryId: catsData[0].id }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Instant cache-first load
    try {
      const cachedItems = sessionStorage.getItem("inforyse_admin_items");
      const cachedCats = sessionStorage.getItem("inforyse_admin_cats");
      if (cachedItems && cachedCats) {
        setItems(JSON.parse(cachedItems));
        setCategories(JSON.parse(cachedCats));
        setLoading(false);
      }
    } catch { /* ignore */ }
    load();
  }, []);

  function openEdit(item: MenuItem) {
    setEditItem(item);
    setForm({
      name: item.name, price: (item.priceCents / 100).toString(),
      categoryId: item.category.id, isVeg: item.isVeg, description: item.description ?? "",
      isAvailable: item.isAvailable, isBestseller: item.isBestseller ?? false,
      isPopular: item.isPopular ?? false, isChefsPick: item.isChefsPick ?? false,
      isTodaySpecial: item.isTodaySpecial ?? false,
      imageUrl: item.imageUrl ?? "",
    });
    setShowAdd(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm({ ...BLANK_FORM, categoryId: categories[0]?.id ?? "" });
    setShowAdd(true);
  }

  async function save() {
    const body = {
      name: form.name, priceCents: Math.round(Number(form.price) * 100),
      categoryId: form.categoryId, isVeg: form.isVeg, description: form.description,
      isAvailable: form.isAvailable, imageUrl: form.imageUrl || null,
    };
    if (editItem) {
      await fetch(`/api/admin/menu-items/${editItem.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/menu-items", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    setEditItem(null); setShowAdd(false); load();
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await fetch(`/api/admin/menu-items/${item.id}`, { method: "DELETE" });
    setEditItem(null); load();
  }

  async function toggleAvail(item: MenuItem) {
    await fetch(`/api/admin/menu-items/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    load();
  }

  async function addCategory(customName?: string) {
    const targetName = (customName || newCatName).trim();
    if (!targetName) return;
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetName }),
      });
      const data = await res.json();
      setNewCatName("");
      if (data.category) {
        setCategories((prev) => [...prev, data.category]);
        setForm((f) => ({ ...f, categoryId: data.category.id }));
      }
      load();
    } catch {
      // silent
    }
  }

  const filtered = items.filter((i) => {
    const matchCat = activeFilter === "all" || i.category.id === activeFilter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const panelOpen = !!editItem || showAdd;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hero banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display">Menu Management 🌿</h1>
              <p className="text-white/60 text-sm mt-0.5">Create, update and organize your menu easily.</p>
            </div>
            <button onClick={openAdd} className="btn-primary bg-white text-[#132A1E] text-sm px-4 py-2 font-semibold">
              <Plus className="h-4 w-4" /> Add New Item
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3 flex-1 overflow-hidden">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${activeFilter === "all" ? "bg-[#132A1E] text-white" : "bg-white border border-black/8 text-gray-600"}`}
            >
              All Items
              <span className={`text-xs rounded-full px-1.5 ${activeFilter === "all" ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>{items.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveFilter(c.id)}
                className={`flex-shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${activeFilter === c.id ? "bg-[#132A1E] text-white" : "bg-white border border-black/8 text-gray-600"}`}
              >
                <span>{catEmoji(c.name)}</span> {c.name}
                <span className={`text-xs rounded-full px-1.5 ${activeFilter === c.id ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                  {items.filter((i) => i.category.id === c.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-10 bg-white" placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center bg-white border border-black/8 rounded-xl p-1 gap-0.5">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-[#132A1E] text-white" : "text-gray-400"}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg ${viewMode === "list" ? "bg-[#132A1E] text-white" : "text-gray-400"}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="card p-0 overflow-hidden border border-gray-100">
                    <div className="h-36 bg-gray-200/70" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200/80 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-200/60 rounded w-1/3 pt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                {filtered.map((item) => (
                  <div key={item.id} className={`card hover:shadow-md transition-all cursor-pointer ${!item.isAvailable ? "opacity-60" : ""}`} onClick={() => openEdit(item)}>
                    {/* Item image */}
                    <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-2xl overflow-hidden flex items-center justify-center">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        : <span className="text-4xl">{catEmoji(item.category.name)}</span>
                      }
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {item.isBestseller && <span className="badge bg-amber-500 text-white text-[10px]"><Star className="h-2.5 w-2.5" />Bestseller</span>}
                        {item.isPopular   && <span className="badge bg-red-500 text-white text-[10px]"><Flame className="h-2.5 w-2.5" />Popular</span>}
                        {item.isChefsPick && <span className="badge bg-blue-500 text-white text-[10px]"><ChefHat className="h-2.5 w-2.5" />Chef's Pick</span>}
                        {item.isTodaySpecial && <span className="badge bg-green-500 text-white text-[10px]"><Sparkles className="h-2.5 w-2.5" />Today's Special</span>}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.category.name}</p>
                        </div>
                        <div className={`h-4 w-4 rounded-sm border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                          <div className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-gray-900">{formatRupees(item.priceCents)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAvail(item); }}
                          className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {item.isAvailable ? "● Available" : "○ Unavailable"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Item</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className={`h-3.5 w-3.5 rounded-sm border-2 flex-shrink-0 ${item.isVeg ? "border-green-600" : "border-red-600"}`} />
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.isBestseller && <span className="text-xs text-amber-600">★ Bestseller</span>}
                            </div>
                          </div>
                        </td>
                        <td className="text-gray-500">{item.category.name}</td>
                        <td className="font-semibold">{formatRupees(item.priceCents)}</td>
                        <td>
                          <span className={`badge ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit / Add side panel */}
      {panelOpen && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">{editItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
            <button onClick={() => { setEditItem(null); setShowAdd(false); }} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Image upload */}
            <ImageUpload
              value={form.imageUrl}
              onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
              folder="menu-items"
              label="Upload dish photo"
              hint="Recommended: 800×800px · JPEG/PNG/WebP · Max 5MB"
              aspectRatio="square"
            />

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Item Name *</label>
                <input className="input" placeholder="e.g. Truffle Mushroom Pasta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="Short description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <p className="text-right text-[10px] text-gray-300 mt-0.5">{form.description.length}/300</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category *</label>
                  <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Price (₹) *</label>
                  <input className="input" type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                  <div className="flex gap-2">
                    <button onClick={() => setForm({ ...form, isVeg: true })} className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${form.isVeg ? "bg-green-500 text-white border-green-500" : "border-black/10 text-gray-500"}`}>● Veg</button>
                    <button onClick={() => setForm({ ...form, isVeg: false })} className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${!form.isVeg ? "bg-red-500 text-white border-red-500" : "border-black/10 text-gray-500"}`}>● Non-Veg</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Availability</label>
                  <button
                    onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
                    className={`w-full rounded-xl py-2 text-xs font-medium border transition-all ${form.isAvailable ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                  >
                    {form.isAvailable ? "● Available" : "○ Unavailable"}
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Badges</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "isBestseller", label: "Bestseller", icon: "⭐", color: "amber" },
                    { key: "isPopular",    label: "Popular",    icon: "🔥", color: "red"   },
                    { key: "isChefsPick", label: "Chef's Pick", icon: "👨‍🍳", color: "blue" },
                    { key: "isTodaySpecial", label: "Today's Special", icon: "✨", color: "green" },
                  ].map(({ key, label, icon, color }) => (
                    <label key={key} className={`flex items-center gap-2 rounded-xl p-2.5 border cursor-pointer transition-all ${(form as any)[key] ? `border-${color}-300 bg-${color}-50` : "border-black/8"}`}>
                      <input type="checkbox" checked={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="sr-only" />
                      <span>{icon}</span>
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add category */}
              <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Add or Quick-Pick Category</p>
                <div className="flex gap-2">
                  <input className="input flex-1 text-xs py-2 bg-white" placeholder="Type custom category name..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                  <button type="button" onClick={() => addCategory()} className="btn-primary bg-[#132A1E] text-white text-xs px-3 py-2 rounded-xl font-bold">Add</button>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["Breakfast", "Snacks & Quick Bites", "Combos & Meals", "Breads & Rice", "Hot Beverages", "Cold Drinks", "Desserts"].map(cName => (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => addCategory(cName)}
                      className="text-[10px] bg-white border border-gray-200 text-gray-600 hover:text-emerald-800 hover:border-emerald-300 px-2 py-0.5 rounded-md font-medium transition-colors"
                    >
                      + {cName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-black/5 grid grid-cols-2 gap-2">
            {editItem && (
              <button onClick={() => deleteItem(editItem)} className="btn-primary border-2 border-red-200 text-red-500 justify-center py-3 rounded-2xl text-sm">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <button onClick={save} className={`btn-primary bg-[#132A1E] text-white justify-center py-3 rounded-2xl text-sm ${!editItem ? "col-span-2" : ""}`}>
              {editItem ? "Update Item" : "Save Item"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
