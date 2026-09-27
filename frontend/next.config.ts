import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app. A stray package-lock.json in a parent
  // folder (C:\Users\Admin) otherwise makes Next.js infer the wrong root.
  // Build/dev scripts always run with the frontend folder as cwd.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
