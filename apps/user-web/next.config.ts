import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dreamteam/ui", "@dreamteam/database", "@dreamteam/auth"],
  // Silence Turbopack warning when webpack config is present
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Excalidraw configuration
  webpack: (config) => {
    // Handle Excalidraw's ES modules
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
  // Rewrite agent-chat to agent-server before filesystem/middleware
  // Use AGENT_SERVER_URL env var, or default to Railway production URL
  async rewrites() {
    const isProduction = process.env.NODE_ENV === "production"
    const defaultRailwayUrl = "https://agent-server-production-580f.up.railway.app"
    const agentServerUrl = isProduction
      ? defaultRailwayUrl
      : (process.env.AGENT_SERVER_URL || defaultRailwayUrl)

    // #region agent log
    console.log(`[agent-server rewrite] env=${process.env.NODE_ENV || "unknown"} target=${agentServerUrl}`)
    // #endregion
    
    return {
      beforeFiles: [
        {
          source: "/api/agent-chat",
          destination: `${agentServerUrl}/agent-chat`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
