-- 088_agent_style_presets.sql
-- Add style presets and custom instructions to agents table

-- Add style_presets column (JSONB for flexibility)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS style_presets JSONB DEFAULT '{"verbosity": "balanced", "tone": "balanced", "examples": "moderate"}';

-- Add custom_instructions column (TEXT for freeform instructions)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- Comments for documentation
COMMENT ON COLUMN agents.style_presets IS 'User-configured style presets: verbosity, tone, examples';
COMMENT ON COLUMN agents.custom_instructions IS 'Custom instructions added by user for this agent';
