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
    // DEV ONLY: the login API includes the OTP directly outside production so
    // you can test without configuring an email provider. See the note on the
    // login route — this field must never exist in a production response.
    setDevOtp(json.devOtp ?? null);
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
        {step === "credentials" ? "Enter your email and password" : "Enter the code emailed to you"}
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
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
              Dev mode — your code is <strong>{devOtp}</strong> (email sending isn't configured yet)
            </p>
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
