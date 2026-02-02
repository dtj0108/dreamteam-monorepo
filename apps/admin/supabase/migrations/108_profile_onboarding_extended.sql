-- Add extended onboarding fields to profiles table
-- These fields support the improved onboarding wizard flow

-- Primary focus selected during onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_focus VARCHAR(50);

-- Decision style preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS decision_style VARCHAR(50);

-- Business context JSON for agent personalization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_context JSONB;

-- Add new values to industry_type enum
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'ecommerce';
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'services';
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'healthcare';
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'other';

-- Add comments for documentation
COMMENT ON COLUMN profiles.primary_focus IS 'Primary business focus: revenue, costs, team, products, operations, cashflow';
COMMENT ON COLUMN profiles.decision_style IS 'Decision-making style preference: data, bottomline, options, balanced';
COMMENT ON COLUMN profiles.business_context IS 'JSON business context for agent personalization';
