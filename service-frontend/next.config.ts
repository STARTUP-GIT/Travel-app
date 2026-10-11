import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app. A stray package-lock.json in a parent
  // folder (C:\Users\Admin) otherwise makes Next.js infer the wrong root.
  // Build/dev scripts always run with the frontend folder as cwd.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async redirects() {
    return [
      {
        source: "/stays/dashboard",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/stays/services/new",
        destination: "/services/new?type=stay",
        permanent: false,
      },
      {
        source: "/stays/services/:serviceId",
        destination: "/services/:serviceId",
        permanent: false,
      },
      {
        source: "/stays/services",
        destination: "/services",
        permanent: false,
      },
      {
        source: "/stays/requests",
        destination: "/requests",
        permanent: false,
      },
      {
        source: "/stays/:path*",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
