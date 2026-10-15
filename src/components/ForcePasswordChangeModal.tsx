"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, CheckCircle2, ArrowRight, LogOut, AlertCircle } from "lucide-react";

export function ForcePasswordChangeModal({
  userEmail,
  restaurantName,
}: {
  userEmail: string;
  restaurantName: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 select-none">
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/90 overflow-hidden animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#132A1E] to-[#1C3C29] p-6 text-white text-center relative">
          <div className="h-14 w-14 mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Security Setup Required</h2>
          <p className="text-emerald-100/80 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
            Welcome to <strong>{restaurantName}</strong>! You are signing in with a temporary password and must create your new secure password before proceeding.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-14 w-14 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Password Updated Successfully!</h3>
              <p className="text-xs text-slate-500">Unlocking your dashboard now...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account badge */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Signed in as</span>
                  <span className="font-semibold text-slate-800 truncate block">{userEmail}</span>
                </div>
                <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px] flex-shrink-0">
                  Initial Sign-in
                </span>
              </div>

              {/* Current Temporary Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Current Temporary Password *
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#132A1E] focus-within:border-transparent transition-all shadow-xs">
                  <KeyRound className="h-4 w-4 text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400 font-mono"
                    placeholder="Enter the dummy password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  New Secure Password *
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#132A1E] focus-within:border-transparent transition-all shadow-xs">
                  <Lock className="h-4 w-4 text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type={showNew ? "text" : "password"}
                    className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
                    placeholder="Min 8 characters"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Confirm New Password *
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#132A1E] focus-within:border-transparent transition-all shadow-xs">
                  <Lock className="h-4 w-4 text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
                    placeholder="Re-type new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary bg-[#132A1E] hover:bg-emerald-950 text-white font-bold py-3.5 rounded-xl justify-center shadow-md text-sm mt-1 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Setting New Password...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Set New Password & Enter Dashboard <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out and change later
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
