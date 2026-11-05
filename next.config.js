/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    // These are Node networking clients used only by Route Handlers. Keeping
    // them external avoids webpack interop breaking their runtime constructors.
    serverComponentsExternalPackages: ["@vercel/functions", "ioredis", "ws"],
  },
};
module.exports = nextConfig;
