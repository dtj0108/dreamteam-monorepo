# Agent Chat UI - Implementation Plan

- [x] Update assistant message UI to add per-message "Work details" toggle and status badges
- [x] Improve chat page header, mobile sidebar behavior, offline banner, and accessibility announcements
- [x] Refine user message display (timestamp on hover) and composer disabled states
- [ ] Validate UI behavior locally (no runtime errors)

## Review
- [x] Summary of changes
Added collapsible work-details timeline with status badges and typing placeholder in assistant messages. Improved chat header with status badge, info/settings sheets, mobile sidebar sheet, offline banner, and SR announcements. Added user timestamp on hover and disabled composer controls when offline or switching conversations.
- [x] Risks and follow-ups
`pnpm` not available in shell, so type-check could not be run.

# Schedule Modal Improvements - Plan

- [x] Widen Create Schedule modal to `max-w-3xl`
- [x] Replace agent select with searchable combobox
- [x] Add `defaultAgentId` support and pass from agent context
- [ ] Validate behavior in key entry points (configure schedules, schedules list)

## Review (Schedule Modal Improvements)
- [x] Summary of changes
Widened the Create Schedule modal and replaced the agent selector with a searchable combobox that shows avatars and optional departments. Added `defaultAgentId` support and passed it from agent-specific contexts and agent-filtered schedules list. Moved frequency/time controls onto a single row, increased the task prompt area, tightened the next-runs box width, and added an autonomy level selector that now sits alongside Next runs in a split layout.
- [x] Risks and follow-ups
Not run locally; please sanity-check the Create Schedule dialog from Configure → Schedules and the schedules list to confirm default selection and search behavior.

# Fix Cross-Workspace Schedule Counts

- [x] Add workspace filter to schedule list API
- [x] Log warning if cross-workspace schedules detected
- [ ] Validate with SQL + UI counts

## Review (Fix Cross-Workspace Schedule Counts)
- [x] Summary of changes
Filtered schedule list queries by workspace ID and added a warning if any cross-workspace schedule slips through.
- [x] Risks and follow-ups
Not run locally; please validate the UI count against the SQL count for the workspace.

# Fix Blank Workspace on First Sign-in

- [x] Fallback to first membership if cookie/default missing
- [x] Set default workspace on join when absent
- [x] Refresh user after workspace cookie set or switch
- [ ] Validate with fresh login + join flow

## Review (Fix Blank Workspace on First Sign-in)
- [x] Summary of changes
Added a server-side fallback to pick a workspace when cookie/default are missing, set default workspace on join when empty, and refreshed the user context after workspace selection to avoid stale UI.
- [x] Risks and follow-ups
Not run locally; please test a fresh login (no cookie) and invite join flow to confirm the workspace is set immediately.

# Fix Agent Tier Mislabeling (Fix-Forward)

- [x] Resolve agent tier from metadata or price ID on subscription.updated
- [x] Preserve existing agent tier when metadata missing
- [ ] Validate Stripe webhook updates no longer downgrade tier

## Review (Fix Agent Tier Mislabeling)
- [x] Summary of changes
Resolved agent tier using subscription metadata or price ID during subscription updates and stopped defaulting to startup when metadata is missing.
- [x] Risks and follow-ups
Not run locally; please verify the webhook updates keep the correct agent_tier for future subscription updates.

# Always-Sync Billing From Stripe (Discover)

- [x] Add Stripe sync helper for already-fetched subscriptions
- [x] Sync agent tier and workspace plan in /api/billing
- [ ] Validate Discover shows correct plan after refresh

## Review (Always-Sync Billing From Stripe)
- [x] Summary of changes
Synced workspace billing from Stripe on every /api/billing request, resolving tiers from metadata or price IDs, and updating workspace_billing in real time.
- [x] Risks and follow-ups
Not run locally; please refresh Discover and confirm the plan display updates to Teams.

# Standardized Agent Tier Upgrade/Downgrade Model

- [x] Add pending tier fields to workspace_billing schema
- [x] Gate agent deployment on Stripe status active
- [x] Schedule downgrades for period end with pending fields
- [x] Apply pending downgrades via hourly cron
- [x] Preserve schedules by disabling (not deleting) removed agents
- [x] Surface pending plan change and schedule disable reasons in UI
- [ ] Validate upgrade/downgrade flows in staging/prod

## Review (Standardized Agent Tier Upgrade/Downgrade Model)
- [x] Summary of changes
Added pending tier fields to workspace_billing and updated billing logic to delay downgrades until period end, deploy agents only when Stripe status is active, and preserve schedules by disabling them. Added an hourly admin cron to apply pending downgrades, improved billing/discover UI to show scheduled plan changes, and surfaced plan-change disabled schedules in the schedules UI.
- [x] Risks and follow-ups
Not run locally; please validate downgrade scheduling (period end), activation gating, and schedule visibility/disable behavior after a tier change.

# Schedule Provisioning Repair + Future-Proofing

- [x] Add fallback insert when schedule template upsert fails
- [x] Add admin repair endpoint to dedupe + re-provision schedules
- [x] Add migration helper to create unique index via RPC
- [ ] Validate repair endpoint on a duplicated workspace

## Review (Schedule Provisioning Repair + Future-Proofing)
- [x] Summary of changes
Added a safe fallback insert path for schedule template cloning, created a superadmin repair endpoint to dedupe schedules, create the unique index, and re-provision missing schedules, plus a migration function to create the index via RPC.
- [x] Risks and follow-ups
Not run locally; please test `/api/admin/repair-schedules` in a duplicated workspace and confirm the unique index is created successfully.
# Prevent Duplicate Agent Tier Subscriptions

- [x] Add helper to resolve and cancel duplicate agent-tier subscriptions
- [x] Use helper in checkout/update/create flows
- [ ] Validate with a Stripe customer that has multiple agent-tier subs

## Review (Prevent Duplicate Agent Tier Subscriptions)
- [x] Summary of changes
Added a resolver that identifies agent-tier subscriptions by metadata or price ID, cancels duplicates, and selects a primary subscription. Wired it into checkout, direct creation, and subscription updates to ensure only one active agent-tier subscription remains.
- [x] Risks and follow-ups
Not run locally; please verify duplicate subscriptions are canceled as expected and the kept subscription remains active.

# Fix Missing Deployed Schedules On Plan Purchase

- [x] Identify all code paths that touch plan purchase, agent-tier billing updates, deployment, and schedule cloning
- [x] Trace values from Stripe event metadata/subscription status to workspace billing state to schedule visibility
- [x] Read each relevant file and capture assumptions/invariants
- [x] Write a root-cause hypothesis document with evidence and failure mode
- [x] Create specification at docs/specs/fix-missing-deployed-schedules-on-plan-purchase.md (current/desired behavior, diagrams, edge cases, files to modify)

## Review (Fix Missing Deployed Schedules On Plan Purchase)
- [x] Summary of findings
Root cause hypothesis: deployment success is being reported based on non-throwing execution, even when provisioning is incomplete (`counts.schedules === 0`). `autoDeployTeamForPlan` returns `deployed: true` after calling `provisionDeploymentResources`, and billing workflows then set `agent_deploy_status='deployed'`, while the schedules API correctly returns an empty workspace-scoped list.
- [x] Risks and follow-ups
Implemented fix-forward: deployment now returns `deployed: false` with `errorCode='provisioning_incomplete'` when provisioning is incomplete, and guest complete-signup now tracks deploy status as pending/failed/deployed with alerts on failure. Additional consistency checks were added to other provisioning call sites (manual deployment + repair + agent-enable provisioning) so incomplete provisioning is not treated as success. Validation run: `npm --prefix packages/database test` and `npm --prefix packages/database run check-types` passed. `npm --prefix apps/user-web run check-types` and `npm --prefix apps/admin run type-check` still fail due existing unrelated baseline type errors.
