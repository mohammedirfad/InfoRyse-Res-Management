"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

export function LoginForm({
  redirectTo,
  theme = "navy",
}: {
  redirectTo: string;
  theme?: "navy" | "forest";
}) {
  const router = useRouter();

  // Mode: "login" | "forgot_email" | "forgot_reset" | "reset_success"
  const [mode, setMode] = useState<"login" | "forgot_email" | "forgot_reset" | "reset_success">("login");

  // Login credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password credentials
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetUserId, setResetUserId] = useState("");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isForest = theme === "forest";
  const btnStyle = isForest
    ? "bg-[#132A1E] hover:bg-[#1B3B2B] text-[#D4A94C] border border-[#D4A94C]/40"
    : "bg-[#0B1736] hover:bg-[#142352] text-white";

  // ── 1. Submit Login Credentials (DIRECT LOGIN — NO OTP REQUIRED) ──
  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid email or password");
        setLoading(false);
        return;
      }
      // Instant direct login without OTP friction
      router.push(redirectTo);
    } catch {
      setError("Unable to connect to login server. Please try again.");
      setLoading(false);
    }
  }

  // ── 2. Submit Forgot Password Email Request ──
  async function submitForgotEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (forgotEmail || email).trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not find account");
        setLoading(false);
        return;
      }
      setResetUserId(json.userId);
      setMode("forgot_reset");
    } catch {
      setError("Network error. Could not request password reset.");
    } finally {
      setLoading(false);
    }
  }

  // ── 3. Submit Reset Password with Code & New Password ──
  async function submitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetUserId,
          code: resetCode.trim(),
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to reset password");
        setLoading(false);
        return;
      }
      if (forgotEmail) setEmail(forgotEmail);
      setPassword("");
      setMode("reset_success");
    } catch {
      setError("Failed to reset password. Please check your network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-black/5 p-7 transition-all">
      {/* ── MODE 1: Direct Sign In (No OTP) ──────────────────────────────────────── */}
      {mode === "login" && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign In</h2>
            <p className="text-xs text-gray-500 mt-1">
              Enter your registered restaurant credentials
            </p>
          </div>

          <form onSubmit={submitCredentials} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  className="input text-sm w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  type="email"
                  placeholder="name@restaurant.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setError(null);
                    setMode("forgot_email");
                  }}
                  className="text-xs font-semibold hover:underline transition-colors"
                  style={{ color: isForest ? "#8A6924" : "#0284c7" }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  className="input text-sm w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg transition-colors z-10"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 leading-relaxed">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full justify-center py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] ${btnStyle}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                </span>
              ) : (
                "Continue to Dashboard"
              )}
            </button>
          </form>

          {/* Quick Help Link for Forgot Password */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setError(null);
                setMode("forgot_email");
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-gray-400" />
              <span>Forgot password? Reset via email OTP</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODE 2: Forgot Password - Email Prompt ──────────────────────────────── */}
      {mode === "forgot_email" && (
        <div>
          <div className="mb-6">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Forgot Password</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Enter your registered restaurant email and we will send you a 6-digit verification code.
            </p>
          </div>

          <form onSubmit={submitForgotEmail} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Your Account Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  className="input text-sm w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  type="email"
                  placeholder="name@restaurant.com"
                  required
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full justify-center py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] ${btnStyle}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Code...
                </span>
              ) : (
                "Send 6-Digit Reset Code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-900 py-2 inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        </div>
      )}

      {/* ── MODE 3: Forgot Password - Enter Code & New Password ─────────────────── */}
      {mode === "forgot_reset" && (
        <div>
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reset Password</h2>
            <p className="text-xs text-gray-500 mt-1">
              Check your email inbox for the 6-digit code sent to <strong className="text-gray-700">{forgotEmail}</strong>
            </p>
          </div>

          <form onSubmit={submitResetPassword} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                6-Digit Verification Code
              </label>
              <input
                className="input tracking-[0.3em] text-center text-xl font-mono font-bold py-2.5 w-full"
                placeholder="······"
                maxLength={6}
                required
                autoFocus
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                New Password (min 8 chars)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  className="input text-sm w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new strong password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg z-10"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  className="input text-sm w-full"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full justify-center py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] ${btnStyle}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                </span>
              ) : (
                "Save & Set Password"
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={submitForgotEmail}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-800 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODE 4: Reset Password Success ───────────────────────────────────────── */}
      {mode === "reset_success" && (
        <div className="text-center py-2 space-y-4 animate-fade-in">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900">Password Updated!</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`btn-primary w-full justify-center py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all ${btnStyle}`}
          >
            Sign In with New Password →
          </button>
        </div>
      )}
    </div>
  );
}
