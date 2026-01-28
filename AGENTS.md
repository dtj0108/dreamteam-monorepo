# DreamTeam Monorepo - Agent Guide

This document provides comprehensive guidance for AI coding agents working on the DreamTeam monorepo.

## Project Overview

DreamTeam is an AI-powered business management platform for founders and entrepreneurs. The platform unifies:

- **Finance**: Accounts, transactions, budgets, analytics, goals
- **Sales**: Leads, contacts, deals, pipelines, workflows (CRM)
- **Team**: Channels, DMs, messaging (Slack-like)
- **Projects**: Projects, tasks, milestones, timelines
- **Knowledge**: Documentation wiki, templates

The project is organized as a monorepo with multiple applications and shared packages.

## Technology Stack

### Core Technologies
- **Package Manager**: pnpm 9.15.0
- **Build Orchestration**: Turbo 2.3.0
- **Language**: TypeScript 5.7.0
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (cookie-based for web, Bearer token for mobile/API)

### Web Applications
- **Framework**: Next.js 16.x with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui patterns via `@dreamteam/ui`
- **State Management**: React hooks + SWR/TanStack Query
- **Testing**: Vitest + Playwright (E2E)

### Mobile Application
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack React Query + React Context

### Backend/Agent Server
- **Framework**: Express.js (Node.js 20)
- **AI SDK**: AI SDK with multiple providers (Anthropic, OpenAI, xAI, Google)
- **MCP**: Model Context Protocol server integration
- **Deployment**: Railway (Docker-based)

## Project Structure

```
dreamteam-monorepo/
├── apps/
│   ├── admin/              # Admin dashboard (Next.js, port 3000)
│   ├── user-web/           # User-facing web app (Next.js, port 3001)
│   ├── user-mobile/        # Mobile app (React Native/Expo)
│   └── agent-server/       # Backend API server (Express.js, port 3003)
├── packages/
│   ├── auth/               # Authentication utilities (@dreamteam/auth)
│   ├── config/             # Shared configuration (ESLint, TypeScript)
│   ├── database/           # Database types, queries, Supabase client (@dreamteam/database)
│   ├── mcp-server/         # MCP server implementation (@dreamteam/mcp-server)
│   └── ui/                 # Shared UI components (@dreamteam/ui)
├── package.json            # Root package.json with workspace scripts
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── turbo.json              # Turbo build pipeline configuration
└── railway.json            # Railway deployment configuration
```

## Build and Development Commands

### Root Level Commands (pnpm)

```bash
# Install all dependencies
pnpm install

# Development - start all apps in parallel
pnpm dev

# Development - specific apps only
pnpm dev:admin            # Admin dashboard only (port 3000)
pnpm dev:user-web         # User web app only (port 3001)
pnpm dev:user-mobile      # Mobile app (Expo)
pnpm dev:server           # Agent server only (port 3003)

# Build all apps
pnpm build

# TypeScript type checking across all packages
pnpm type-check
```

### App-Specific Commands

#### Admin & User-Web (Next.js apps)
```bash
# In apps/admin or apps/user-web
npm run dev               # Start development server
npm run build             # Production build
npm run start             # Start production server
npm run lint              # Run ESLint
npm run type-check        # TypeScript check
npm run test              # Run all tests (Vitest)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests (Playwright)
npm run test:coverage     # Test with coverage report
```

#### User-Mobile (Expo)
```bash
# In apps/user-mobile
npm start                 # Start Expo development server
npm run ios               # Run on iOS simulator
npm run android           # Run on Android emulator
npm run web               # Run in web browser
```

#### Agent-Server (Express)
```bash
# In apps/agent-server
npm run dev               # Start with hot reload (tsx watch)
npm run build             # Compile TypeScript
npm run start             # Start compiled server
npm run test              # Run tests (Vitest)
```

## Code Organization

### Apps Structure

#### Admin App (`apps/admin/`)
```
src/
├── app/
│   ├── (admin)/            # Protected admin panel pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── users/          # User management
│   │   ├── workspaces/     # Workspace management
│   │   ├── feature-flags/  # Feature toggles
│   │   ├── api-keys/       # API key management
│   │   ├── audit-logs/     # Admin action logs
│   │   └── settings/       # Platform settings
│   ├── (auth)/login/       # Login page
│   └── api/admin/          # Admin API routes
├── components/
│   ├── admin/              # Admin-specific components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── admin.ts        # Admin client (bypasses RLS)
│   └── admin-auth.ts       # Auth helpers
├── types/
│   └── database.ts         # Database types
└── tests/                  # Test suites
    ├── unit/
    ├── integration/
    ├── e2e/
    ├── __mocks__/
    └── setup.ts
```

#### User-Web App (`apps/user-web/`)
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth routes (login, signup)
│   ├── api/                # API routes
│   ├── finance/            # Finance module
│   ├── crm/                # Sales/CRM module
│   ├── messaging/          # Team messaging
│   ├── projects/           # Project management
│   ├── knowledge/          # Knowledge base
│   └── ...
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── providers/              # React context providers
├── types/                  # TypeScript types
└── __tests__/              # Test files
```

#### Agent Server (`apps/agent-server/`)
```
src/
├── index.ts                # Express server entry point
├── agent-chat.ts           # Main agent chat handler
├── agent-channel-handler.ts # Channel webhook handler
├── scheduled-execution.ts  # Scheduled task execution
├── tools-test.ts           # Tool testing endpoint
├── types/                  # TypeScript types
└── lib/
    ├── ai-providers.ts     # AI SDK provider configuration
    ├── agent-session.ts    # Agent session management
    ├── delegation-handler.ts # Tool delegation logic
    ├── mcp-client.ts       # MCP client for tool execution
    ├── supabase.ts         # Supabase client
    └── ...
```

### Shared Packages

#### `@dreamteam/auth`
- Authentication utilities for Next.js apps
- Session management helpers
- Exports: `index.ts`, `session.ts`

#### `@dreamteam/database`
- Supabase client configurations
- Database TypeScript types
- Reusable query functions
- Auto-deployment utilities
- Exports: `client`, `server`, `types`, `queries`

#### `@dreamteam/ui`
- Shared React components based on shadcn/ui
- Tailwind-compatible styling
- 40+ components (button, card, dialog, table, etc.)
- Individual component exports for tree-shaking

#### `@dreamteam/mcp-server`
- MCP (Model Context Protocol) server implementation
- Tool definitions for AI agents
- Binary: `dreamteam-mcp`

#### `@dreamteam/config`
- Shared ESLint configuration (`eslint.next.mjs`)
- Shared TypeScript configurations (`tsconfig.base.json`, `tsconfig.nextjs.json`)
- Shared Tailwind configuration (`tailwind.config.ts`)

## Testing Strategy

### Test Framework: Vitest
- **Unit Tests**: Fast, isolated tests for utility functions
- **Integration Tests**: Tests with database/mock interactions
- **Environment**: jsdom (admin), happy-dom (user-web)

### E2E Testing: Playwright
- Full browser automation testing
- Tests critical user flows
- Runs against built application

### Coverage Requirements (Admin App)
| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| `admin-auth.ts` | 100% | 100% | 100% | 100% |
| `encryption.ts` | 100% | 100% | 100% | 100% |
| `tool-schema-validator.ts` | 95% | 95% | 95% | 95% |
| `cron-utils.ts` | 95% | 95% | 95% | 95% |
| `deployment.ts` | 90% | 90% | 90% | 90% |
| `ai-sdk-provider.ts` | 85% | 85% | 85% | 85% |

### CI/CD Pipeline (GitHub Actions)
Located in `apps/admin/.github/workflows/test.yml`:
1. **Unit & Integration Tests**: Run Vitest with coverage
2. **E2E Tests**: Build app and run Playwright tests
3. **Type Check**: TypeScript compilation check

## Key Patterns and Conventions

### Authentication
- **Web apps**: Cookie-based sessions via Supabase SSR
- **Mobile/API**: Bearer token authentication
- Admin routes require `superadmin` status
- Use `requireSuperadmin()` from `@/lib/admin-auth` in API routes

### Database Access
- Always use `@dreamteam/database` for database operations
- Use `createAdminClient()` for admin operations (bypasses RLS)
- Use `createClient()` for user-scoped operations
- All admin actions are logged via `logAdminAction()`

### Import Paths
- `@/*` maps to `./src/*` in all apps
- Workspace packages use `workspace:*` protocol
- Example: `import { Button } from "@dreamteam/ui/button"`

### Styling
- **Web**: Tailwind CSS v4 with custom theme
- **Mobile**: NativeWind with Tailwind CSS v3
- Primary color: `#0ea5e9` (sky-500)
- Components use `class-variance-authority` for variants

### AI/LLM Integration
- AI SDK for multiple provider support
- MCP server for tool execution
- Agent server handles long-running operations
- Tool delegation pattern for workspace-specific actions

## Deployment

### Web Apps (Vercel)
- Admin and User-Web deploy to Vercel
- Environment variables in `.env.local` files
- Production branches: `main`

### Agent Server (Railway)
- Docker-based deployment
- Configuration in `railway.json` and `Dockerfile`
- Runs on port 3002 in container (maps to 3003 externally)
- Requires subprocess spawning (not serverless-compatible)

### Mobile (EAS Update)
- OTA updates via Expo EAS
- Channels: `production`, `preview`, `development`
- Command: `CI=1 npx eas-cli update --channel production --message "Update"`

## Environment Variables

### Required for All Apps
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Admin App Additional
```
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=
```

### Agent Server
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# AI provider API keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
GOOGLE_API_KEY=
```

### Mobile
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Security Considerations

- **RLS (Row Level Security)**: Enabled on all Supabase tables
- **Admin Client**: Bypasses RLS - use only in server contexts
- **Encryption**: Sensitive data encrypted with AES-256-GCM
- **CORS**: Agent server allows cross-origin requests for API access
- **Non-root Container**: Agent server Dockerfile runs as `appuser`

## Important File Locations

| Purpose | Path |
|---------|------|
| Root config | `package.json`, `turbo.json`, `pnpm-workspace.yaml` |
| Admin app | `apps/admin/` |
| User web | `apps/user-web/` |
| Mobile app | `apps/user-mobile/` |
| Agent server | `apps/agent-server/` |
| Database package | `packages/database/src/` |
| UI components | `packages/ui/src/` |
| MCP server | `packages/mcp-server/src/` |
| Shared config | `packages/config/` |
| CI/CD workflow | `apps/admin/.github/workflows/test.yml` |
| Docker config | `apps/agent-server/Dockerfile` |
| Railway config | `railway.json` |

## Development Workflow

1. **Make changes** in relevant app/package
2. **Run type-check**: `pnpm type-check`
3. **Run tests**: `npm run test` in specific app
4. **Build**: `pnpm build` to verify production build
5. **Test E2E**: `npm run test:e2e` for critical flows

## Documentation References

- Root: `CLAUDE.md` - General project overview
- Admin: `apps/admin/CLAUDE.md` - Admin-specific guidance
- Mobile: `apps/user-mobile/CLAUDE.md` - Mobile development guide
- Additional docs may exist in nested `CLAUDE.md` files
