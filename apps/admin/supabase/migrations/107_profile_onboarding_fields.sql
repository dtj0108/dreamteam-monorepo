-- Add onboarding-related fields to profiles table
-- These fields support the user onboarding wizard flow

-- Onboarding wizard completion status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Selected primary goal during onboarding (finance, sales, team, projects, knowledge, agents)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_goal VARCHAR(50);

-- Team size selected during onboarding (solo, small, medium, large)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_size VARCHAR(20);

-- Tracks whether user has viewed the reports/analytics page (for onboarding checklist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_viewed_reports BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding wizard';
COMMENT ON COLUMN profiles.onboarding_goal IS 'Primary goal selected during onboarding: finance, sales, team, projects, knowledge, or agents';
COMMENT ON COLUMN profiles.team_size IS 'Team size selected during onboarding: solo, small, medium, or large';
COMMENT ON COLUMN profiles.has_viewed_reports IS 'Whether user has viewed the analytics/reports page';
