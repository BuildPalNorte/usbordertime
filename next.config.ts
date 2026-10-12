import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  async headers() {
    return [
      {
        // The browser must be able to see a new service worker, or a phone keeps the old one.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
  images: {
    // Google profile photos shown in the account button.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" }],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
