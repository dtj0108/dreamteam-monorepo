# Hypothesis: Missing Schedules After Agent-Tier Purchase

## Investigation Checklist

- [x] Identify all code paths that touch purchase/deploy/schedule data
- [x] Trace value flow from origin to UI display
- [x] Read each relevant file and capture assumptions/invariants
- [x] Form a root-cause hypothesis with evidence

## Code Paths That Touch This Data

### Purchase and billing-triggered deploy

- `apps/user-web/src/app/api/billing/checkout/route.ts`  
  Creates Stripe Checkout metadata and subscription metadata (`workspace_id`, `type`, `target_plan`, `agent_tier`).
- `apps/user-web/src/app/api/billing/webhook/route.ts`  
  Handles `checkout.session.completed` and `customer.subscription.updated`; sets deploy status pending/deployed/failed around `autoDeployTeamForPlan`.
- `apps/user-web/src/lib/billing-queries.ts`  
  Direct card-on-file subscription creation/update also calls `autoDeployTeamForPlan` and updates deploy status.
- `apps/user-web/src/app/api/auth/complete-signup/route.ts`  
  Guest checkout completion path deploys immediately after workspace creation.
- `packages/database/src/apply-pending-tier.ts`  
  Pending-tier CAS apply path deploys and updates deploy status.
- `apps/admin/src/app/api/cron/apply-pending-agent-downgrades/route.ts`  
  Retries failed deploys.

### Deployment and schedule provisioning

- `packages/database/src/auto-deploy.ts`  
  Main deploy orchestrator; calls `provisionDeploymentResources` and returns `deployed: true` unless hard error.
- `packages/database/src/deployment-resources.ts`  
  Performs clone + profile/channel provisioning, detects incomplete provisioning, logs audit, but returns normally.
- `packages/database/src/schedule-templates.ts`  
  Clones templates into workspace schedules; errors are logged, not propagated.

### Schedule display

- `apps/user-web/src/app/api/agents/schedules/route.ts`  
  Fetches schedules by `workspace_id`; empty result is shown if clones never existed.
- `apps/user-web/src/providers/agents-provider.tsx`  
  Calls schedules API and stores returned list.
- `apps/user-web/src/app/agents/(list)/schedules/page.tsx`  
  Renders provider schedules list.

### Data-model constraints affecting this bug

- `apps/admin/supabase/migrations/104_schedule_templates.sql`  
  Template model + workspace clone behavior.
- `apps/admin/supabase/migrations/114_enforce_schedule_templates.sql`  
  Enforces template/workspace invariants.
- `apps/admin/supabase/migrations/117_create_agent_schedules_unique_index.sql`  
  Unique index helper for workspace clone dedupe.
- `apps/admin/supabase/migrations/118_billing_schedule_integrity.sql`  
  Adds deploy status fields used by billing/deploy paths.

## Value Trace: Origin To Display

1. Checkout/subscription metadata carries target tier (`target_plan` / `agent_tier`).
2. Webhook or direct billing flow updates `workspace_billing` and calls `autoDeployTeamForPlan(workspaceId, tier)`.
3. `autoDeployTeamForPlan` inserts/updates deployment records and calls provisioning.
4. Provisioning calls schedule clone + agent resources, then computes counts.
5. Even when counts show `schedules === 0`, provisioning only logs incomplete state.
6. `autoDeployTeamForPlan` still returns success (`deployed: true`).
7. Caller marks `workspace_billing.agent_deploy_status='deployed'`.
8. UI requests `/api/agents/schedules?workspaceId=...`; API returns empty schedules due to real DB state.

## Assumptions And Invariants Observed

- Deployment success is currently inferred from absence of thrown exceptions, not from provisioning completeness.
- `provisionDeploymentResources` has an internal completeness check (`counts.schedules === 0`) but it is non-fatal.
- Schedule cloning intentionally uses best-effort error handling and can return with no created schedules.
- Billing status updates trust `autoDeployTeamForPlan(...).deployed` as the source of truth.
- Schedule list API is correctly workspace-scoped; empty list reflects missing rows, not UI filtering error.

## Root-Cause Hypothesis

The primary root cause is a success-contract mismatch:

- Provisioning logic detects incomplete deployment (including zero schedules), but
- deployment orchestration still reports success,
- causing billing to be marked deployed even though no workspace schedules were provisioned.

In short: incomplete provisioning is observable internally but not propagated to the deploy result used by billing workflows.

## Evidence (File + Line)

- `packages/database/src/deployment-resources.ts:157` to `packages/database/src/deployment-resources.ts:174`  
  Incomplete condition includes `counts.schedules === 0`.
- `packages/database/src/deployment-resources.ts:176` to `packages/database/src/deployment-resources.ts:193`  
  Incomplete provisioning is logged only (audit log), not thrown.
- `packages/database/src/auto-deploy.ts:509` to `packages/database/src/auto-deploy.ts:515`  
  Same-team branch calls provisioning, then returns `deployed: true`.
- `packages/database/src/auto-deploy.ts:608` to `packages/database/src/auto-deploy.ts:615`  
  New-deploy branch calls provisioning, then returns `deployed: true`.
- `packages/database/src/schedule-templates.ts:43` to `packages/database/src/schedule-templates.ts:50`  
  Template-fetch issues or no templates return early.
- `packages/database/src/schedule-templates.ts:135` to `packages/database/src/schedule-templates.ts:138`  
  Catch block logs and suppresses cloning failure.
- `apps/user-web/src/app/api/billing/webhook/route.ts:212` to `apps/user-web/src/app/api/billing/webhook/route.ts:223`  
  Billing marks deployed or failed solely on `deployResult.deployed`.
- `apps/user-web/src/app/api/agents/schedules/route.ts:76` and `apps/user-web/src/app/api/agents/schedules/route.ts:123`  
  Schedule list is workspace-filtered and returns empty list when rows do not exist.

## Competing Hypotheses Considered

1. UI filtering bug  
  Rejected: API returns workspace-scoped rows; empty list matches DB absence.
2. Membership/RLS read failure  
  Rejected: would produce 403/500, not successful empty deployed state.
3. Plan/team mapping issue only  
  Possible in some environments, but this would usually make deploy fail (not deploy marked successful with no schedules).
4. Missing templates only  
  Contributing factor, but still masked by the same success-contract issue.

## Hypothesis Approval Gate

No code changes proposed yet.  
If you approve this hypothesis, next step is to propose a minimal patch that makes deployment success depend on provisioning completeness (especially non-zero schedule clones for enabled agents).
