"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({
  redirectTo = "/",
  onSignOut,
}: {
  redirectTo?: string;
  onSignOut?: () => void;
}) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        // Never leave another account's data in the shared browser cache.
        onSignOut?.();
        await fetch("/api/auth/logout", { method: "POST" });
        router.push(redirectTo);
      }}
      className="w-full text-left text-sm text-white/60 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
    >
      ↪ Sign out
    </button>
  );
}
