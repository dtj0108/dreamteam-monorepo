-- 090_plans_seed_data.sql
-- Seed initial pricing plans matching the hardcoded pricing page data

-- ============================================
-- 1. WORKSPACE PLANS
-- ============================================

-- Monthly workspace plan
INSERT INTO plans (name, slug, description, plan_type, price_monthly, price_yearly, is_active, is_coming_soon, features, limits, display_config)
VALUES (
  'Monthly',
  'monthly',
  'Workspace subscription billed monthly',
  'workspace_plan',
  4900,  -- $49.00 in cents
  58800, -- $588.00/year (no discount for monthly)
  true,
  false,
  '["All 5 products (Finance, Sales, Team, Projects, Knowledge)", "Unlimited accounts & transactions", "Analytics & reporting", "100 GB storage", "Up to 10 users included", "+$10/mo per additional user", "Priority support"]'::jsonb,
  '{"users": 10, "storage_gb": 100}'::jsonb,
  '{"savings_text": "Cancel anytime"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  plan_type = EXCLUDED.plan_type,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_config = EXCLUDED.display_config;

-- Annual workspace plan (best value)
INSERT INTO plans (name, slug, description, plan_type, price_monthly, price_yearly, is_active, is_coming_soon, features, limits, display_config)
VALUES (
  'Annual',
  'annual',
  'Workspace subscription billed annually',
  'workspace_plan',
  3900,  -- $39.00/mo in cents
  46800, -- $468.00/year in cents
  true,
  false,
  '["All 5 products (Finance, Sales, Team, Projects, Knowledge)", "Unlimited accounts & transactions", "Analytics & reporting", "100 GB storage", "Up to 10 users included", "+$10/mo per additional user", "Priority support"]'::jsonb,
  '{"users": 10, "storage_gb": 100}'::jsonb,
  '{"badge_text": "Best Value", "savings_text": "Save 20% vs monthly"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  plan_type = EXCLUDED.plan_type,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_config = EXCLUDED.display_config;

-- ============================================
-- 2. AGENT TIERS
-- ============================================

-- Startup tier (7 agents)
INSERT INTO plans (name, slug, description, plan_type, price_monthly, price_yearly, is_active, is_coming_soon, features, limits, display_config)
VALUES (
  'Lean Startup',
  'startup',
  'What should I do, and how do I actually do it?',
  'agent_tier',
  300000,  -- $3,000/mo in cents
  3600000, -- $36,000/year in cents
  true,
  false,
  '[]'::jsonb,
  '{"agents": 7}'::jsonb,
  '{
    "tagline": "You + a few killers in one room",
    "human_equivalent": "$840K",
    "agent_count": 7,
    "departments": [
      {"name": "Leadership", "agents": ["Founder Agent"]},
      {"name": "Execution", "agents": ["Operations Agent"]},
      {"name": "Sales", "agents": ["Sales Agent"]},
      {"name": "Marketing", "agents": ["Marketing Agent"]},
      {"name": "Finance", "agents": ["Finance Agent"]},
      {"name": "Systems", "agents": ["Systems Agent"]},
      {"name": "People", "agents": ["Performance Agent"]}
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  plan_type = EXCLUDED.plan_type,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_config = EXCLUDED.display_config;

-- Teams tier (18 agents) - Most Popular
INSERT INTO plans (name, slug, description, plan_type, price_monthly, price_yearly, is_active, is_coming_soon, features, limits, display_config)
VALUES (
  'Department Teams',
  'teams',
  'How do I make this run smoother and make more money?',
  'agent_tier',
  500000,  -- $5,000/mo in cents
  6000000, -- $60,000/year in cents
  true,
  false,
  '[]'::jsonb,
  '{"agents": 18}'::jsonb,
  '{
    "tagline": "Now you''ve got specialists",
    "badge_text": "Most Popular",
    "human_equivalent": "$2.2M",
    "agent_count": 18,
    "departments": [
      {"name": "Leadership", "agents": ["Vision Agent", "Decision Agent", "Planning Agent"]},
      {"name": "Execution", "agents": ["Task Breakdown Agent", "Process Agent", "Accountability Agent"]},
      {"name": "Sales", "agents": ["Script Agent", "Objection Agent", "Follow-Up Agent"]},
      {"name": "Marketing", "agents": ["Messaging Agent", "Content Agent", "Funnel Agent"]},
      {"name": "Finance", "agents": ["Cash Flow Agent", "Pricing Agent"]},
      {"name": "Systems", "agents": ["Automation Agent", "Tooling Agent"]},
      {"name": "People", "agents": ["Focus Agent", "Energy Agent"]}
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  plan_type = EXCLUDED.plan_type,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_config = EXCLUDED.display_config;

-- Enterprise tier (38 agents)
INSERT INTO plans (name, slug, description, plan_type, price_monthly, price_yearly, is_active, is_coming_soon, features, limits, display_config)
VALUES (
  'Enterprise Dream Team',
  'enterprise',
  'How do I build something big without burning out?',
  'agent_tier',
  1000000,   -- $10,000/mo in cents
  12000000,  -- $120,000/year in cents
  true,
  false,
  '[]'::jsonb,
  '{"agents": 38}'::jsonb,
  '{
    "tagline": "This is unfair",
    "human_equivalent": "$4.6M",
    "agent_count": 38,
    "departments": [
      {"name": "Leadership", "agents": ["CEO Agent", "Strategy Agent", "Risk Agent", "Priority Agent", "Long-Term Vision Agent"]},
      {"name": "Execution", "agents": ["Program Manager Agent", "Workflow Architect Agent", "Bottleneck Detector Agent", "SOP Agent", "QA Agent", "Execution Monitor Agent"]},
      {"name": "Sales", "agents": ["Sales Strategist Agent", "Pipeline Agent", "Objection Intelligence Agent", "Deal Review Agent", "Follow-Up Automation Agent", "Revenue Forecast Agent"]},
      {"name": "Marketing", "agents": ["Brand Agent", "Growth Experiments Agent", "Content Strategy Agent", "Distribution Agent", "Funnel Optimization Agent", "Analytics Agent"]},
      {"name": "Finance", "agents": ["CFO Agent", "Forecasting Agent", "Unit Economics Agent", "Capital Allocation Agent", "Exit / M&A Agent"]},
      {"name": "Systems", "agents": ["Automation Architect Agent", "AI Workflow Agent", "Data Agent", "Integration Agent", "Scalability Agent"]},
      {"name": "People", "agents": ["Hiring Agent", "Org Design Agent", "Leadership Coach Agent", "Burnout Prevention Agent", "Talent Optimization Agent"]}
    ]
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  plan_type = EXCLUDED.plan_type,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_config = EXCLUDED.display_config;

-- ============================================
-- 3. COMMENTS
-- ============================================
COMMENT ON TABLE plans IS 'Pricing plans for workspaces and agent tiers. Workspace plans are monthly/annual subscriptions. Agent tiers are AI agent packages.';
