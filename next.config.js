/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.SUPABASE_URL ? [{ protocol: "https", hostname: new URL(process.env.SUPABASE_URL).hostname, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
  experimental: {
    typedRoutes: false,
    // These are Node networking clients used only by Route Handlers. Keeping
    // them external avoids webpack interop breaking their runtime constructors.
    // PDFKit relies on Node resolving its package font aliases at runtime.
    serverComponentsExternalPackages: ["@vercel/functions", "ioredis", "ws", "pdfkit"],
  },
};
module.exports = nextConfig;
