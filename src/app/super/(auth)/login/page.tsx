import { LoginForm } from "@/components/LoginForm";

export default function SuperLoginPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-white text-center flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1F4733] to-[#132A1E] border border-[#D4A94C]/40 p-3 shadow-xl flex items-center justify-center">
          <img src="/icon.svg" alt="InfoRyse" className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight font-display text-white">
            Info<span className="text-[#D4A94C]">Ryse</span>
          </h1>
          <p className="text-[#D4A94C] text-xs font-bold tracking-widest uppercase mt-0.5">Super Admin Platform</p>
        </div>
      </div>
      <LoginForm redirectTo="/super/dashboard" theme="navy" />
    </div>
  );
}
