-- Add industry_type column to profiles table
-- This was missing from the original schema

-- Create the industry_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'industry_type') THEN
    CREATE TYPE industry_type AS ENUM ('saas', 'retail', 'service', 'general');
  END IF;
END $$;

-- Add the industry_type column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry_type industry_type DEFAULT 'general';

-- Add comment for documentation
COMMENT ON COLUMN profiles.industry_type IS 'Business industry type: saas, retail, service, or general';
