"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  redirectTo,
  theme = "navy",
}: {
  redirectTo: string;
  theme?: "navy" | "forest";
}) {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null); // dev convenience only, see note below

  const accent = theme === "navy" ? "bg-navy-accent" : "bg-forest-accent text-forest";

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error);
    setUserId(json.userId);
    setStep("otp");
    setDevOtp(json.devOtp ?? null);
    if (json.devOtp) setCode(json.devOtp);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error);
    router.push(redirectTo);
  }

  return (
    <div className="w-full max-w-sm card p-6">
      <h1 className="text-xl font-semibold mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-5">
        {step === "credentials" ? "Enter your email and password" : "Enter the 6-digit verification code"}
      </p>

      {step === "credentials" ? (
        <form onSubmit={submitCredentials} className="space-y-3">
          <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className={`btn-primary w-full text-white justify-center ${accent}`}>
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="space-y-3">
          {devOtp && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-900">Verification code:</span>
                <span className="font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded border border-amber-300 text-amber-950 tracking-wider">
                  <strong>{devOtp}</strong>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-700 pt-0.5">
                <span>Email service not configured yet</span>
                <button
                  type="button"
                  onClick={() => setCode(devOtp)}
                  className="font-semibold underline text-amber-900 hover:text-amber-950"
                >
                  Auto-fill code
                </button>
              </div>
            </div>
          )}
          <input
            className="input tracking-[0.3em] text-center text-lg"
            placeholder="······"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className={`btn-primary w-full text-white justify-center ${accent}`}>
            {loading ? "Verifying..." : "Verify & Sign in"}
          </button>
        </form>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Dev note: the seed script prints a console OTP hook — wire <code>issueOtp</code> in{" "}
        <code>src/lib/auth.ts</code> to Resend/SMTP to actually send it by email.
      </p>
    </div>
  );
}
