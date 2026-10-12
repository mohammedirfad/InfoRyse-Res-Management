import { LoginForm } from "@/components/LoginForm";

export default function SuperLoginPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-white text-center">
        <h1 className="text-3xl font-display">InfoRyse</h1>
        <p className="text-navy-accent text-sm tracking-widest uppercase">Super Admin Platform</p>
      </div>
      <LoginForm redirectTo="/super/dashboard" theme="navy" />
    </div>
  );
}
