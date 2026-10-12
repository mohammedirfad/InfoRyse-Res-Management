"use client";

import { useEffect, useState } from "react";
import { Save, MapPin, Phone, Mail, Globe, Instagram, Facebook, Youtube, Eye } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

type Hours = { open: string; close: string; enabled: boolean };

export default function RestaurantProfilePage() {
  const [tab, setTab] = useState("basic");
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl]       = useState("");
  const [coverUrl, setCoverUrl]     = useState("");
  const [name, setName]     = useState("Riverside Café");
  const [tagline, setTagline] = useState("Good Food, Brighter Moments");
  const [cuisine, setCuisine] = useState("Multi Cuisine");
  const [about, setAbout]   = useState("Riverside Café brings a delightful dining experience with a perfect blend of traditional and modern cuisines.");
  const [address1, setAddress1] = useState("123, MG Road");
  const [address2, setAddress2] = useState("Near City Mall");
  const [city, setCity]     = useState("Bengaluru");
  const [state, setState]   = useState("Karnataka");
  const [pincode, setPincode] = useState("560001");
  const [phone, setPhone]   = useState("+91 98765 43210");
  const [email, setEmail]   = useState("riversidecafe@gmail.com");
  const [website, setWebsite] = useState("https://www.riversidecafe.in");
  const [instagram, setInstagram] = useState("https://instagram.com/riversidecafe");
  const [facebook, setFacebook]   = useState("https://facebook.com/riversidecafe");
  const [youtube, setYoutube]     = useState("https://youtube.com/riversidecafe");
  const [hours, setHours]   = useState<Hours[]>(
    DAYS.map(() => ({ open: "11:00", close: "23:00", enabled: true }))
  );

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setHour(idx: number, field: keyof Hours, val: string | boolean) {
    setHours((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  }

  const TABS = [
    { id: "basic",       label: "Basic Information" },
    { id: "branding",    label: "Branding & Media"  },
    { id: "operational", label: "Operational Details"},
    { id: "contact",     label: "Contact & Social"  },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display">Restaurant Profile 🌿</h1>
              <p className="text-white/60 text-sm mt-0.5">Manage your restaurant information, branding and operational details.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary bg-white/10 border border-white/20 text-white text-sm px-4 py-2">
                <Eye className="h-4 w-4" /> View Live Menu
              </button>
              <button onClick={save} className="btn-primary bg-[#D4A94C] text-[#132A1E] text-sm px-4 py-2 font-semibold">
                <Save className="h-4 w-4" /> {saved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 px-6 pt-4 pb-0 border-b border-black/5 bg-white">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? "border-[#132A1E] text-[#132A1E]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {tab === "basic" && (
            <>
              {/* Restaurant info */}
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Restaurant Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name *</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Tagline</label>
                    <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cuisine Type</label>
                    <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                      {["Multi Cuisine","North Indian","South Indian","Chinese","Continental","Italian","Fast Food","Cafe & Bakery"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Category *</label>
                    <select className="input">
                      <option>Restaurant & Café</option>
                      <option>Fine Dining</option>
                      <option>Quick Service</option>
                      <option>Cloud Kitchen</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">About Restaurant *</label>
                    <textarea className="input resize-none" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} />
                    <p className="text-right text-[10px] text-gray-300">{about.length}/500</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Address Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Address Line 1 *</label>
                    <input className="input" value={address1} onChange={(e) => setAddress1(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Address Line 2</label>
                    <input className="input" value={address2} onChange={(e) => setAddress2(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">City *</label>
                    <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">State *</label>
                    <input className="input" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Pincode *</label>
                    <input className="input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                </div>
                {/* Map placeholder */}
                <div className="h-40 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 flex flex-col items-center justify-center gap-2 text-green-700">
                  <MapPin className="h-8 w-8" />
                  <p className="text-sm font-medium">{address1}, {city}</p>
                  <button className="text-xs underline">Change Location</button>
                </div>
              </div>
            </>
          )}

          {tab === "branding" && (
            <>
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Restaurant Logo</h2>
                <ImageUpload
                  value={logoUrl}
                  onChange={setLogoUrl}
                  folder="restaurant-logos"
                  label="Upload Restaurant Logo"
                  hint="Recommended: 512×512px · PNG/WebP · Max 5MB"
                  aspectRatio="square"
                  className="max-w-[160px]"
                />
                <h2 className="font-semibold text-gray-900 pt-2">Cover Image</h2>
                <ImageUpload
                  value={coverUrl}
                  onChange={setCoverUrl}
                  folder="covers"
                  label="Upload Cover Image"
                  hint="Recommended: 1200×400px · JPEG/WebP · Max 5MB"
                  aspectRatio="landscape"
                />
                {/* Restaurant images */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Restaurant Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Cover Image", "Interior Image", "Food Image"] as const).map((label) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400 mb-1 text-center">{label}</p>
                        <ImageUpload
                          folder="covers"
                          label=""
                          hint=""
                          aspectRatio="square"
                          onChange={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Appearance Settings</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Primary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" defaultValue="#1B5E20" className="h-10 w-10 rounded-xl border border-black/10 cursor-pointer" />
                      <input className="input flex-1 font-mono text-sm" defaultValue="#1B5E20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Secondary Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" defaultValue="#F9A825" className="h-10 w-10 rounded-xl border border-black/10 cursor-pointer" />
                      <input className="input flex-1 font-mono text-sm" defaultValue="#F9A825" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Font Style</label>
                  <select className="input">
                    <option>Poppins (Default)</option>
                    <option>Playfair Display</option>
                    <option>Lato</option>
                    <option>Roboto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Menu Theme</label>
                  <select className="input">
                    <option>Leaf Green (Default)</option>
                    <option>Classic Dark</option>
                    <option>Warm Amber</option>
                    <option>Ocean Blue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Menu Language</label>
                  <select className="input">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Kannada</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === "operational" && (
            <div className="card p-5 col-span-2">
              <h2 className="font-semibold text-gray-900 mb-4">Business Hours</h2>
              <div className="space-y-3">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28">
                      <button
                        onClick={() => setHour(i, "enabled", !hours[i].enabled)}
                        className={`relative h-6 w-10 rounded-full transition-colors ${hours[i].enabled ? "bg-[#132A1E]" : "bg-gray-200"}`}
                      >
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${hours[i].enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    <p className="w-28 text-sm font-medium text-gray-700">{day}</p>
                    {hours[i].enabled ? (
                      <>
                        <div className="flex items-center gap-2">
                          <input type="time" className="input w-28 text-sm py-1.5" value={hours[i].open} onChange={(e) => setHour(i, "open", e.target.value)} />
                          <span className="text-gray-400 text-sm">—</span>
                          <input type="time" className="input w-28 text-sm py-1.5" value={hours[i].close} onChange={(e) => setHour(i, "close", e.target.value)} />
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "contact" && (
            <>
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Contact Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Phone className="h-3 w-3" />Phone Number *</label>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Mail className="h-3 w-3" />Email Address *</label>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Globe className="h-3 w-3" />Website (Optional)</label>
                    <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="card p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">Social Media Links</h2>
                <div className="space-y-3">
                  {[
                    { icon: Instagram, label: "Instagram", val: instagram, set: setInstagram, placeholder: "https://instagram.com/yourrestaurant" },
                    { icon: Facebook,  label: "Facebook",  val: facebook,  set: setFacebook,  placeholder: "https://facebook.com/yourrestaurant" },
                    { icon: Youtube,   label: "YouTube",   val: youtube,   set: setYoutube,   placeholder: "https://youtube.com/yourrestaurant"  },
                  ].map(({ icon: Icon, label, val, set, placeholder }) => (
                    <div key={label}>
                      <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Icon className="h-3 w-3" />{label}</label>
                      <input className="input" value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live preview panel */}
      <div className="w-72 flex-shrink-0 border-l border-black/5 bg-gray-50 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-black/5 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Live Preview (Customer View)</p>
          <button className="text-xs text-[#132A1E] hover:underline">View Full Menu</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="card overflow-hidden">
            {/* Mock customer header */}
            <div className="bg-gradient-to-br from-[#132A1E] to-[#2D5A3D] text-white p-4 rounded-t-2xl text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#D4A94C]/20 text-[#D4A94C] text-lg font-bold mb-2">K</div>
              <p className="font-display text-lg">{name || "Restaurant Name"}</p>
              <p className="text-xs text-white/60 mt-0.5">{tagline}</p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600"><span className="text-xs">⭐</span> 4.5 · 100+ Reviews · Moderate · {cuisine}</div>
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium"><span className="h-2 w-2 bg-green-500 rounded-full inline-block" />Open Now · 11:00 AM – 11:00 PM</div>
              <div className="flex items-center gap-1.5 text-gray-500 text-xs"><Phone className="h-3 w-3" />{phone}</div>
              <div className="flex items-center gap-1.5 text-gray-500 text-xs"><MapPin className="h-3 w-3" />{city}, {state}</div>
              <div className="mt-3 pt-3 border-t border-black/5">
                <p className="text-xs font-semibold text-gray-700 mb-2">Our Specials</p>
                <div className="flex gap-1 overflow-x-auto">
                  {["All","Starters","Main Course","Beverages","Desserts"].map((c) => (
                    <span key={c} className="flex-shrink-0 text-xs bg-[#132A1E] text-white rounded-full px-2.5 py-1">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
