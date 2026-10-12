"use client";

import { useState } from "react";
import { Save, Bell, Shield, Settings, Database, CreditCard, Globe } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
    >
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export default function SuperSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("general");

  const [platform, setPlatform] = useState({
    enableRestaurantReg: true,
    enableCustomerReg: true,
    requireRestaurantApproval: false,
    enableOrderScheduling: false,
    enableTableBooking: true,
  });
  const [notifications, setNotifications] = useState({
    orderNotifications: true,
    paymentNotifications: true,
    payoutNotifications: true,
    supportTicketNotifications: true,
    marketingNotifications: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: true,
    loginAlerts: true,
    auditUserActions: true,
    restrictLoginByIp: false,
  });

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const TABS = [
    { id: "general",        label: "General Settings",      icon: Settings   },
    { id: "platform",       label: "Platform Configuration", icon: Globe      },
    { id: "notifications",  label: "Notification Settings", icon: Bell       },
    { id: "security",       label: "Security Settings",     icon: Shield     },
    { id: "data",           label: "Data Management",       icon: Database   },
    { id: "billing",        label: "Subscription & Pricing",icon: CreditCard },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Tab sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-black/5 bg-white p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-3">Settings</p>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all ${tab === t.id ? "bg-[#0B1736] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            <t.icon className="h-4 w-4 flex-shrink-0" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white">
          <h1 className="text-lg font-semibold text-gray-900">Platform Settings</h1>
          <button onClick={save} className="btn-primary bg-[#0B1736] text-white text-sm px-5 py-2">
            <Save className="h-4 w-4" /> {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl">
          {tab === "general" && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">General Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Platform Name</label>
                  <input className="input" defaultValue="InfoRyse" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tagline</label>
                  <input className="input" defaultValue="Taste | Technology | Transformation" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Support Email</label>
                  <input className="input" defaultValue="support@inforyse.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Support Phone</label>
                  <input className="input" defaultValue="+91 98765 43210" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Time Zone</label>
                  <select className="input"><option>(GMT+5:30) Asia/Kolkata</option></select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Default Language</label>
                  <select className="input"><option>English</option><option>Hindi</option></select>
                </div>
              </div>
            </div>
          )}

          {tab === "platform" && (
            <div className="card p-6 space-y-1">
              <h2 className="font-semibold text-gray-900 mb-4">Platform Configuration</h2>
              <p className="text-sm text-gray-400 mb-4">Configure platform features and operational settings.</p>
              {[
                { key: "enableRestaurantReg",     label: "Enable Restaurant Registration",  desc: "Allow new restaurants to register."          },
                { key: "enableCustomerReg",        label: "Enable Customer Registration",    desc: "Allow new customers to register."            },
                { key: "requireRestaurantApproval",label: "Require Restaurant Approval",     desc: "Manually approve new restaurant accounts."   },
                { key: "enableOrderScheduling",    label: "Enable Order Scheduling",         desc: "Allow customers to schedule future orders."  },
                { key: "enableTableBooking",       label: "Enable Table Booking",            desc: "Enable dine-in table reservation system."   },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3.5 border-t border-black/5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <Toggle checked={(platform as any)[key]} onChange={(v) => setPlatform((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
          )}

          {tab === "notifications" && (
            <div className="card p-6 space-y-1">
              <h2 className="font-semibold text-gray-900 mb-4">Notification Settings</h2>
              {[
                { key: "orderNotifications",         label: "Order Notifications",         desc: "Notify on new orders." },
                { key: "paymentNotifications",        label: "Payment Notifications",       desc: "Notify on successful payments." },
                { key: "payoutNotifications",         label: "Payout Notifications",        desc: "Notify on payout states." },
                { key: "supportTicketNotifications",  label: "Support Ticket Notifications",desc: "Notify on new support tickets." },
                { key: "marketingNotifications",      label: "Marketing Notifications",     desc: "Send promotional updates." },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3.5 border-t border-black/5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <Toggle checked={(notifications as any)[key]} onChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))} />
                </div>
              ))}
              <div className="pt-3 border-t border-black/5">
                <button className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">
                  Configure Templates
                </button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="card p-6 space-y-1">
              <h2 className="font-semibold text-gray-900 mb-4">Security Settings</h2>
              {[
                { key: "twoFactor",           label: "Two-Factor Authentication (2FA)", desc: "For admin accounts."                    },
                { key: "loginAlerts",          label: "Login Alerts",                    desc: "Notify on new login attempts."          },
                { key: "auditUserActions",     label: "Audit User Actions",              desc: "Track important user activities."       },
                { key: "restrictLoginByIp",    label: "Restrict Login by IP",            desc: "Allow only specific IP addresses."     },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3.5 border-t border-black/5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <Toggle checked={(security as any)[key]} onChange={(v) => setSecurity((s) => ({ ...s, [key]: v }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Session Timeout</label>
                  <select className="input"><option>30 Minutes</option><option>1 Hour</option><option>4 Hours</option></select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Password Expiry</label>
                  <select className="input"><option>90 Days</option><option>60 Days</option><option>Never</option></select>
                </div>
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Data Management</h2>
              <div className="flex items-center justify-between py-3.5 border-t border-black/5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto Backup</p>
                  <p className="text-xs text-gray-400">Daily automatic database backup.</p>
                </div>
                <Toggle checked={true} onChange={() => {}} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Backup Time</label>
                  <input className="input" type="time" defaultValue="02:00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Data Retention</label>
                  <select className="input"><option>1 Year</option><option>2 Years</option><option>5 Years</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button className="btn-primary border border-black/10 text-gray-700 justify-center py-2.5 text-sm rounded-xl">
                  ↓ Export Platform Data
                </button>
                <button className="btn-primary border border-red-100 text-red-500 justify-center py-2.5 text-sm rounded-xl hover:bg-red-50">
                  Clear Cache
                </button>
              </div>
            </div>
          )}

          {tab === "billing" && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Subscription & Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Pricing Model</label>
                  <select className="input"><option>Subscription (Monthly/Yearly)</option><option>Per-Order Commission</option></select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Commission per Order (%)</label>
                  <input className="input" type="number" defaultValue="5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Basic Plan (Monthly)</label>
                  <input className="input" defaultValue="₹2,999" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Standard Plan (Monthly)</label>
                  <input className="input" defaultValue="₹4,999" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Premium Plan (Monthly)</label>
                  <input className="input" defaultValue="₹7,999" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Free Trial Period (Days)</label>
                  <input className="input" type="number" defaultValue="14" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
