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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
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
        {
          source: "/ai-info.md",
          destination: "/ai-info",
        },
        {
          source: "/llms.txt",
          destination: "/llms-txt",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
