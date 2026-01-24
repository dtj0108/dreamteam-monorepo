# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DreamTeam Mobile is the React Native/Expo companion app for the **dreamteam.ai** web platform. The web app is a fully-built Next.js application, and this mobile app mirrors its functionality for iOS and Android.

**dreamteam.ai** is an AI-powered business management platform for founders and entrepreneurs that unifies:
- Financial management
- CRM/Sales pipeline
- Team collaboration (Slack-like)
- Project management
- Knowledge base/wiki

## Safety & Boundaries

Claude Code should NEVER:
- Delete or modify files outside this project directory
- Run commands that affect system-level settings or configurations
- Execute `rm -rf` or similar destructive commands without explicit user confirmation
- Access, read, or modify credentials, SSH keys, or sensitive files in `~/.ssh`, `~/.aws`, etc.
- Make network requests to unknown/untrusted endpoints
- Install global packages or modify system PATH
- Push code to remote repositories without explicit permission
- Run commands that could incur costs (cloud provisioning, paid APIs) without confirmation
- Modify `.env` files without showing the changes first

Claude Code SHOULD:
- Stay within the project directory (`/Users/drewbaskin/dreamteam-mobile`)
- Ask before any potentially destructive operation
- Show file contents before major modifications
- Use project-local dependencies (npm, not global installs)

## Workflow Preferences

**Plan Mode:**
- Create a comprehensive, ordered to-do list
- For longer/complex tasks, break them into logical phases or chunks
- Each phase can have multiple sub-tasks
- Keep tasks actionable and specific
- It's okay to plan ambitious multi-phase work

**Work Mode:**
- Do NOT stop until ALL to-dos are completed
- Do NOT pause between phases - work through everything continuously
- Mark items complete as you go
- Only pause to ask questions if truly blocked

### Product Architecture

The platform is organized into **5 Products**, each essentially a full app:

| Product | Emoji | Description |
|---------|-------|-------------|
| Finance | 💰 | Accounts, transactions, budgets, analytics, goals |
| Sales | 🤝 | Leads, contacts, deals, pipelines, workflows |
| Team | 💬 | Channels, DMs, messaging (Slack-like) |
| Projects | 📋 | Projects, tasks, milestones, timelines |
| Knowledge | 📖 | Documentation wiki, templates |

### Web ↔ Mobile Relationship

- **Web app**: Next.js, fully built with all features
- **Mobile app**: React Native/Expo, being built to mirror web functionality
- **Shared backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Reference docs**: `.md` files from the web app describe features to implement

When building mobile features, reference the web app's `.md` documentation files to understand:
- Data models and database schema
- API endpoints and payloads
- UI/UX patterns and flows
- Business logic and validation rules

## Development Commands

```bash
# Start the development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack React Query + React Context
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Auth**: Email/password via Supabase Auth
- **Effects**: expo-glass-effect (iOS liquid glass)

## Architecture

### File Structure

```
app/                    # Expo Router pages (file-based routing)
├── _layout.tsx         # Root layout with providers
├── index.tsx           # Entry redirect (auth check)
├── (auth)/             # Auth screens (login, signup)
└── (main)/             # Authenticated screens with tab navigation
    ├── _layout.tsx     # Tab navigator with ProductSwitcher header
    ├── finance/        # 💰 Financial tracking module
    ├── sales/          # 🤝 CRM/Sales module
    ├── team/           # 💬 Team messaging module
    ├── projects/       # 📋 Project management module
    └── more/           # Settings, Knowledge, AI agents
components/             # Shared UI components
├── ProductSwitcher.tsx # Header product selector
├── ProductDrawer.tsx   # Slide-out product navigation (glass effect)
├── Logo.tsx            # dreamteam.ai branded logo
lib/                    # Core utilities
├── supabase.ts         # Supabase client (uses AsyncStorage)
└── api.ts              # API client with error handling
providers/              # React context providers
├── auth-provider.tsx   # Auth state (useAuth hook)
├── workspace-provider.tsx # Organization workspace context
└── product-provider.tsx   # Product definitions and routing
constants/
└── Colors.ts           # Design system colors
```

### Key Patterns

**Root Layout** (`app/_layout.tsx`):
- Wraps app in QueryClientProvider, AuthProvider, WorkspaceProvider
- Font loading and splash screen management

**Entry Point** (`app/index.tsx`):
- Redirects to `/(main)/finance` if authenticated
- Redirects to `/(auth)/login` if not authenticated

**Product Switcher**:
- Header shows current product emoji + name
- Tapping opens slide-out drawer from left
- Glass effect on iOS via expo-glass-effect
- Navigates between products via router.push()

**Auth Flow**:
- Email/password authentication via Supabase
- Session persisted in AsyncStorage
- `useAuth()` hook provides: `user`, `session`, `isLoading`, `login`, `signup`, `signOut`

### Navigation Structure

- **Bottom tabs**: Finance, Sales, Team, Projects, More
- **Header**: ProductSwitcher (left), Profile (right)
- **Each tab**: Stack navigator for nested screens
- **Knowledge**: Nested under More tab, accessible via ProductDrawer

## Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Design System

Uses NativeWind with custom theme. See `STYLE.md` for full reference.

### Colors (constants/Colors.ts)
- Primary: `#0ea5e9` (sky-500)
- Destructive: `#ef4444` (red-500)
- Success: `#22c55e` (green-500)
- Foreground: `#0a0a0a`
- Muted: `#f5f5f5`

### Branding
- Logo: "dreamteam" (black) + ".ai" (primary blue)
- Product icons: Emojis (💰 🤝 💬 📋 📖)

## OTA Updates (EAS Update)

Push JavaScript updates to users without going through the App Store.

### Quick Command

```bash
# For TestFlight/App Store users (production channel)
CI=1 npx eas-cli update --channel production --message "Your update message" --platform ios

# For internal preview builds
CI=1 npx eas-cli update --channel preview --message "Your update message" --platform ios

# Android
CI=1 npx eas-cli update --channel production --message "Your update message" --platform android
```

### Channels

| Channel | Build Profile | Who Gets It |
|---------|--------------|-------------|
| `production` | production | App Store / TestFlight users |
| `preview` | preview | Internal testers (ad-hoc distribution) |
| `development` | development | Dev client users |

### Important Notes

1. **Match channel to build**: Updates only work when the channel matches the build's channel. TestFlight builds use `production` channel.

2. **Fingerprint compatibility**: If you see "No compatible builds found", native code has changed and you need a new build (`eas build`). OTA only works for JS-only changes.

3. **Web bundling issues**: If web export fails (e.g., native-only modules), use `--platform ios` or `--platform android` to skip web.

4. **User gets update**: Users need to fully close and reopen the app to receive the update.

### When OTA Works vs Needs New Build

| Change Type | OTA Works? |
|-------------|-----------|
| JS/TSX code changes | ✅ Yes |
| Style changes | ✅ Yes |
| New npm package (JS-only) | ✅ Yes |
| New native module | ❌ Need new build |
| Expo SDK upgrade | ❌ Need new build |
| app.json config changes | ❌ Need new build |

## Building Features from Web Docs

When given a `.md` file from the web app:

1. **Understand the feature**: Read the doc to understand data models, API, and UX
2. **Map to mobile**: Adapt web patterns to mobile (e.g., modals → sheets, tables → lists)
3. **Reuse backend**: Use the same Supabase tables and queries
4. **Match functionality**: Ensure feature parity with web where possible
5. **Mobile-first UX**: Optimize for touch, gestures, and smaller screens
