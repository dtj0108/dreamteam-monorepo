# DreamTeam Monorepo

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in parallel
pnpm dev:admin            # Admin dashboard only (port 3000)
pnpm dev:user-web         # User web app only (port 3001)
pnpm dev:user-mobile      # Mobile app (Expo)
pnpm dev:server           # Agent server only (port 3003)
pnpm build                # Build all apps
pnpm type-check           # TypeScript check all packages
```

## Architecture

### Monorepo Structure
- **Package Manager**: pnpm 9.15.0
- **Build Orchestration**: Turbo 2.3.0

### Apps (`/apps`)
- `admin` - Admin dashboard (Next.js 16.x, port 3000)
- `user-web` - User-facing web app (Next.js 16.x, port 3001)
- `user-mobile` - Mobile app (React Native/Expo SDK 54)
- `agent-server` - Backend API server (Express.js, port 3003)

### Shared Packages (`/packages`)
- `@dreamteam/auth` - Authentication utilities (Supabase auth)
- `@dreamteam/config` - Shared configuration (ESLint, TypeScript)
- `@dreamteam/database` - Database types, queries, and Supabase client
- `@dreamteam/mcp-server` - MCP server implementation
- `@dreamteam/ui` - Shared UI components (shadcn/ui based)

## Tech Stack

- **Web Framework**: Next.js 16.x (admin, user-web)
- **Mobile**: React Native with Expo SDK 54
- **Backend**: Express.js (agent-server)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS (web), NativeWind (mobile)
- **UI Components**: shadcn/ui via @dreamteam/ui

## Key Patterns

### Authentication
Dual auth support across platforms:
- **Web apps**: Cookie-based sessions via Supabase SSR
- **Mobile/API**: Bearer token authentication

### Database Access
Use `@dreamteam/database` for all database operations:
- Exports Supabase client configured for the environment
- Contains shared TypeScript types generated from schema
- Provides reusable query functions

### Shared UI
Import from `@dreamteam/ui` for consistent components:
- Based on shadcn/ui patterns
- Tailwind-compatible styling

### Agent Server
Runs on Railway in production:
- Supports subprocess spawning for AI agents
- MCP (Model Context Protocol) server integration
- Handles long-running operations not suited for serverless

## App-Specific Documentation

See nested CLAUDE.md files for app-specific guidance:
- `apps/admin/CLAUDE.md` - Admin dashboard specifics
- `apps/user-mobile/CLAUDE.md` - Mobile app development guide

## Safety & Boundaries

Rules for safe operation within this project:
- **Stay within project directory**: Only operate within `/Users/drewbaskin/dreamteam-monorepo-1`
- **No destructive commands without confirmation**: Ask before `rm -rf`, `git reset --hard`, database drops, etc.
- **No accessing sensitive files**: Do not read or modify `~/.ssh`, `~/.aws`, `.env` files outside this project, or other credential stores
- **No pushing to remote without permission**: Always ask before `git push` or deploying
- **Ask before major modifications**: Large refactors, schema changes, or architectural changes require explicit approval

## Philosophy & Thinking

Apply first principles reasoning:
- **Deconstruct problems to fundamental truths**: Break down complex issues into their basic components
- **Understand underlying systems before solving**: Know how the code actually works, not just what it appears to do
- **Question assumptions**: Always ask "why?" when something seems off or unclear
- **Build up solutions from basics**: Start with the simplest working solution and add complexity only as needed
- **Trace execution, don't guess**: Follow the actual code paths rather than assuming behavior

## Workflow Preferences

### Plan Mode
When planning work:
- Create comprehensive, ordered to-do lists
- Break complex tasks into logical phases
- Keep tasks actionable and specific
- Identify dependencies between tasks

### Work Mode
When executing work:
- Do NOT stop until ALL to-dos are completed
- Do NOT pause between phases - work continuously
- Mark items complete as you go
- Only pause to ask questions if truly blocked
- If an error occurs, debug and fix it before moving on