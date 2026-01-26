import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dreamteam/ui", "@dreamteam/database", "@dreamteam/auth"],
  // Silence Turbopack warning when webpack config is present
  turbopack: {},
  // Excalidraw configuration
  webpack: (config) => {
    // Handle Excalidraw's ES modules
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
  // Rewrite agent-chat to agent-server before filesystem/middleware
  // Use local agent-server in development, Railway in production
  async rewrites() {
    const agentServerUrl = process.env.NODE_ENV === 'production'
      ? "https://agent-server-production-580f.up.railway.app"
      : (process.env.AGENT_SERVER_URL || "http://localhost:3002");
    // #region agent log
    console.log(`[DEBUG] agent-server rewrite target: ${agentServerUrl}`);
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
