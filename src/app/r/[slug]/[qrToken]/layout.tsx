import { CartProvider } from "@/components/CartContext";

export default function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string; qrToken: string };
}) {
  return (
    // CartProvider is now keyed per-table (slug + qrToken) so the cart
    // persists across page navigation and browser close/reopen for the same table.
    <CartProvider restaurantSlug={params.slug} qrToken={params.qrToken}>
      <div className="min-h-screen bg-[#FBF7F1]">{children}</div>
    </CartProvider>
  );
}
