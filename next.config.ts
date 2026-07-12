import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep development artifacts isolated from production builds. Running
  // `next build` while a dev server is active can otherwise invalidate the
  // shared webpack manifests and produce ENOENT/_document.js runtime errors.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
