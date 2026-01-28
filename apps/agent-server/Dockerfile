# Agent Server Dockerfile
# Builds the Express server for Railway deployment
# Handles Claude Agent SDK with subprocess spawning for MCP server

FROM node:20

# Install pnpm (Claude Code CLI is bundled with the SDK, no need to install globally)
RUN npm install -g pnpm

# Create a non-root user for running the application
# Claude Code CLI refuses --dangerously-skip-permissions when running as root
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory to repo root
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agent-server/package.json ./apps/agent-server/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/database/package.json ./packages/database/
COPY packages/config/package.json ./packages/config/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/config/ ./packages/config/
COPY packages/database/ ./packages/database/
COPY packages/mcp-server/ ./packages/mcp-server/
COPY apps/agent-server/ ./apps/agent-server/

# Build MCP server (needed at runtime for stdio transport)
RUN pnpm --filter=@dreamteam/mcp-server build

# Build agent server
RUN pnpm --filter=agent-server build

# Create directories that Claude Code CLI needs and set ownership
RUN mkdir -p /home/appuser/.claude && \
    chown -R appuser:appuser /app /home/appuser

# Expose the port
EXPOSE 3002

# Set working directory to agent-server for runtime
WORKDIR /app/apps/agent-server

# Switch to non-root user
USER appuser

# Set HOME for the non-root user (Claude Code writes config to ~/.claude.json)
ENV HOME=/home/appuser

# Start the server
CMD ["node", "dist/index.js"]
