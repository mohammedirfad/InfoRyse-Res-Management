import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-display">InfoRyse QR Ordering</h1>
        <p className="text-gray-500">Development entry points</p>
        <div className="space-y-3">
          <Link href="/super/login" className="card block p-4 hover:shadow-md transition-shadow">
            <p className="font-medium">Super Admin</p>
            <p className="text-xs text-gray-400">Platform-wide control</p>
          </Link>
          <Link href="/admin/login" className="card block p-4 hover:shadow-md transition-shadow">
            <p className="font-medium">Restaurant Owner / Staff</p>
            <p className="text-xs text-gray-400">Menu, tables, orders</p>
          </Link>
          <Link href="/r/riverside-cafe/demo" className="card block p-4 hover:shadow-md transition-shadow">
            <p className="font-medium">Customer Menu (demo)</p>
            <p className="text-xs text-gray-400">
              Replace "demo" with a real qrToken from your seeded tables after running the seed script
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
