/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    // These are Node networking clients used only by Route Handlers. Keeping
    // them external avoids webpack interop breaking their runtime constructors.
    // PDFKit relies on Node resolving its package font aliases at runtime.
    serverComponentsExternalPackages: ["@vercel/functions", "ioredis", "ws", "pdfkit"],
  },
};
module.exports = nextConfig;
