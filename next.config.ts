import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep development artifacts isolated from production builds. Running
  // `next build` while a dev server is active can otherwise invalidate the
  // shared webpack manifests and produce ENOENT/_document.js runtime errors.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // Tree-shake heavy icon / UI packages during DEV compile.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config, { nextRuntime, webpack }) => {
    // Instrumentation Edge compile must not resolve Node-only bootstrap /
    // opportunity persistence (node:fs / node:path).
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource: string, context: string) {
            if (
              resource.includes("instrumentation.node") ||
              resource.includes("deferred-bootstrap") ||
              resource.includes("opportunity-engine/persistence") ||
              resource.includes("opportunity-engine/scheduler")
            ) {
              return true;
            }
            if (
              context.includes(`${path.sep}instrumentation`) &&
              (resource === "node:fs" || resource === "node:path")
            ) {
              return true;
            }
            return false;
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;
