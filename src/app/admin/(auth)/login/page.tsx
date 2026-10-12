import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-forest flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-white text-center">
        <h1 className="text-3xl font-display">Kpe</h1>
        <p className="text-forest-accent text-sm tracking-widest uppercase">Restaurant Partner Panel</p>
      </div>
      <LoginForm redirectTo="/admin/dashboard" theme="forest" />
    </div>
  );
}
