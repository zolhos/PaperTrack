import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? "/PaperTrack" : "",
  images: {
    unoptimized: true, // Required for static export
  },
  // Allow 127.0.0.1 dev origins to avoid HMR websocket blocking
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost:3000"],
};

export default nextConfig;
