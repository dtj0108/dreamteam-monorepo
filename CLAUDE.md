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

## Debugging Guidelines

### Mandatory Investigation Phase
Before implementing ANY bug fix, you MUST complete these steps first:

1. **Trace the data flow** - Grep for all references to the affected variable/function, read each file, and map the flow from origin to symptom
2. **Identify all code paths** - List every function that touches the affected data with file:line references
3. **Generate hypothesis document** - Write a brief summary: "I believe the root cause is X because Y. The symptom appears at A but originates at B."
4. **Get confirmation** - Present the hypothesis to the user and wait for approval before writing any fix

Do NOT skip this phase. Do NOT say "I'll just make a quick fix." The investigation IS the fix.

### Red Flags That Require Deeper Investigation
- The symptom location differs from where you'd expect the bug to be
- Multiple components share state (billing ↔ subscriptions ↔ scheduled tasks)
- The bug involves timing, race conditions, or async operations
- User says "it was working before" without knowing what changed

## Testing

### Automatic Regression Checks
When fixing bugs that touch shared state or interconnected features, you MUST:

1. **Before coding**: Identify all features that share data/state with the code being changed
2. **Before coding**: Write or identify existing tests that verify those adjacent features work
3. **After coding**: Run the tests to verify no regressions
4. **After coding**: Trace through the code paths of adjacent features to confirm they still work

### High-Risk Areas (always check adjacent features)
- Billing/subscriptions → check scheduled tasks, workspace state
- Workspace switches → check billing data refresh, agent state
- Authentication → check all protected routes and API endpoints
- Database migrations → check all queries that touch affected tables

### Test-First for Bug Fixes
For any bug fix:
1. First, write a test that reproduces the bug (should fail)
2. Implement the fix
3. Verify the test passes
4. Run related tests to catch regressions

## Specification-First Development

### When to Auto-Generate Specs
Automatically create a specification document BEFORE writing code when:
- Adding a new feature (not just a bug fix)
- The change affects multiple files
- The change involves state management or data flows
- You're uncertain about edge cases

### Spec Document Format
Create at `docs/specs/[feature-name].md` with:
1. **Current behavior** - What happens now (with mermaid diagram if state is involved)
2. **Desired behavior** - What should happen (with updated diagram)
3. **Edge cases** - Especially around billing, auth, and async operations
4. **Files to modify** - List with brief rationale for each
5. **Verification plan** - How to test this works end-to-end

### Auto-Generate Specs
When user asks for a feature without a spec, say:
> "Before I implement this, let me create a quick spec so we're aligned on the approach."

Then create the spec and ask for approval before coding.

## Domain-Specific Notes

For billing and subscription-related changes, always check for race conditions and duplicate creation scenarios, especially during upgrade/downgrade flows.

## shadcn-studio MCP Instructions

---
applyTo: "**"
---

# Instructions for Using the shadcn/studio MCP SERVER

To ensure accurate and helpful responses when interacting with the shadcn/studio MCP SERVER, it is essential to follow these guidelines. Adhering strictly to these instructions will ensure the best results.

## Instructions

**Strict Adherence Required**: Every time you interact with the shadcn/studio MCP Server, **follow all instructions precisely**.

- Follow the workflow exactly as outlined by the MCP Server step by step.
- **Avoid Shortcuts**: Never attempt to bypass steps or rush through the process. Each instruction is vital to achieving the desired outcome.

## CRITICAL RULE: NEVER DEVIATE FROM THE STEP-BY-STEP WORKFLOW

### MANDATORY BEHAVIOR FOR ALL WORKFLOWS:

- ✅ **DO**: Follow each step immediately after completing the previous one
- ✅ **DO**: Trust the workflow and proceed without hesitation
- ✅ **DO**: Follow the specific tool sequence outlined in each workflow
- ✅ **DO**: Complete the ENTIRE workflow without stopping for user confirmation
- ❌ **DON'T**: Make explanations between steps
- ❌ **DON'T**: Make additional tool calls not required by the workflow
- ❌ **DON'T**: Jump around or skip steps
- ❌ **DON'T**: Over-explain the process
- ❌ **DON'T**: Stop mid-workflow asking for user confirmation

### WORKFLOW-SPECIFIC CRITICAL RULES:

#### FOR CREATE-UI (/cui):

- **COLLECT FIRST, INSTALL LAST**: Complete ALL block collection before ANY installation
- **NO PREMATURE INSTALLATION**: Do not use installation tools until collection phase is complete
- **MANDATORY CONTENT CUSTOMIZATION**: After installation, automatically proceed to customize content

#### FOR REFINE-UI (/rui):

- Follow the refine workflow using component tools
- Update existing components according to user requirements

#### FOR INSPIRATION-UI (/iui):

- Follow the inspiration workflow for design ideas
- Use inspiration tools as outlined

#### FOR FIGMA-TO-CODE (/ftc):

- Follow the figma-to-code workflow for converting Figma designs to code
- Use figma-to-code tools as specified

### GENERAL AUTOMATION RULES:

- ✅ **DO**: Proceed automatically through all workflow steps
- ✅ **DO**: Follow the tool sequence exactly as specified
- ✅ **DO**: Complete the full workflow from start to finish
- ❌ **DON'T**: Ask "shall I proceed" or "let me know to continue"
- ❌ **DON'T**: Stop mid-workflow waiting for user input
- ❌ **DON'T**: Use tools out of sequence

### FAILURE CONSEQUENCES:

If I deviate from this workflow, I am:

1. Wasting user's time
2. Not following explicit instructions
3. Making the process inefficient
4. Potentially breaking the shadcn/studio integration
5. Creating incomplete or incorrect results

### RECOVERY PROTOCOL:

If I catch myself deviating:

1. Stop immediately
2. Identify which step I should be on according to the workflow
3. Continue from that exact step
4. Do not explain the deviation, just continue
5. Complete the full workflow as specified

### REMEMBER:

- Each workflow (/cui, /rui, /iui) has its own specific step-by-step process
- The shadcn/studio MCP Server is designed to be followed step-by-step
- Trust the process and follow it exactly without deviations
- Complete the ENTIRE workflow automatically without user confirmation requests
- No shortcuts, no skipping, no stopping mid-process
