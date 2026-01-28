-- A2P 10DLC Brand and Campaign Registration
-- This migration creates tables for managing SMS messaging compliance via A2P 10DLC registration

-- =====================================================
-- Table: a2p_brands
-- Stores business/company information for brand registration
-- =====================================================
CREATE TABLE a2p_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Brand Information
  brand_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'sole_proprietor',
    'corporation',
    'llc',
    'partnership',
    'non_profit',
    'government'
  )),
  ein TEXT, -- Employer Identification Number (optional, format: XX-XXXXXXX)

  -- Contact Information
  email TEXT NOT NULL,
  phone TEXT NOT NULL, -- E.164 format: +1XXXXXXXXXX
  website TEXT,

  -- Address Information
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL, -- 2-letter code
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- Industry Classification
  vertical TEXT NOT NULL CHECK (vertical IN (
    'professional_services',
    'real_estate',
    'healthcare',
    'retail',
    'technology',
    'financial_services',
    'education',
    'hospitality',
    'transportation',
    'manufacturing',
    'construction',
    'agriculture',
    'energy',
    'media',
    'telecommunications',
    'insurance',
    'legal',
    'other'
  )),

  -- Registration Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending',
    'approved',
    'rejected',
    'suspended'
  )),

  -- Twilio Integration (populated when submitted)
  twilio_brand_sid TEXT UNIQUE,

  -- Status Tracking
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_brand_name_per_workspace UNIQUE (workspace_id, brand_name)
);

-- Indexes for a2p_brands
CREATE INDEX idx_a2p_brands_workspace ON a2p_brands(workspace_id);
CREATE INDEX idx_a2p_brands_status ON a2p_brands(status);
CREATE INDEX idx_a2p_brands_twilio_sid ON a2p_brands(twilio_brand_sid) WHERE twilio_brand_sid IS NOT NULL;
CREATE INDEX idx_a2p_brands_user ON a2p_brands(user_id);

-- =====================================================
-- Table: a2p_campaigns
-- Stores messaging campaign configurations
-- =====================================================
CREATE TABLE a2p_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES a2p_brands(id) ON DELETE CASCADE,

  -- Campaign Information
  campaign_name TEXT NOT NULL,
  use_case TEXT NOT NULL CHECK (use_case IN (
    'marketing',
    'customer_care',
    'mixed',
    'two_factor_auth',
    'account_notifications',
    'appointment_reminders',
    'delivery_notifications',
    'fraud_alerts',
    'higher_education',
    'polling_voting',
    'public_service_announcement',
    'security_alerts',
    'emergency'
  )),
  sub_use_case TEXT,

  -- Message Samples (3-5 required)
  message_samples TEXT[] NOT NULL,

  -- Opt-in/Opt-out Configuration
  opt_in_workflow TEXT NOT NULL, -- Description of consent process
  opt_in_keywords TEXT[] DEFAULT ARRAY['START', 'YES', 'UNSTOP']::TEXT[],
  opt_out_keywords TEXT[] DEFAULT ARRAY['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']::TEXT[],
  help_keywords TEXT[] DEFAULT ARRAY['HELP', 'INFO']::TEXT[],
  help_message TEXT DEFAULT 'Reply HELP for help, STOP to unsubscribe.',
  opt_out_message TEXT DEFAULT 'You have been unsubscribed and will receive no further messages.',

  -- Compliance Attributes
  direct_lending BOOLEAN DEFAULT false,
  embedded_link BOOLEAN DEFAULT false,
  embedded_phone BOOLEAN DEFAULT false,
  age_gated BOOLEAN DEFAULT false,
  affiliate_marketing BOOLEAN DEFAULT false,

  -- Volume Estimate
  expected_monthly_volume INTEGER DEFAULT 1000,

  -- Registration Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending',
    'approved',
    'rejected',
    'suspended'
  )),

  -- Twilio Integration
  twilio_campaign_sid TEXT UNIQUE,

  -- Status Tracking
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_campaign_name_per_workspace UNIQUE (workspace_id, campaign_name),
  CONSTRAINT valid_message_samples_count CHECK (array_length(message_samples, 1) BETWEEN 3 AND 5)
);

-- Indexes for a2p_campaigns
CREATE INDEX idx_a2p_campaigns_workspace ON a2p_campaigns(workspace_id);
CREATE INDEX idx_a2p_campaigns_brand ON a2p_campaigns(brand_id);
CREATE INDEX idx_a2p_campaigns_status ON a2p_campaigns(status);
CREATE INDEX idx_a2p_campaigns_twilio_sid ON a2p_campaigns(twilio_campaign_sid) WHERE twilio_campaign_sid IS NOT NULL;

-- =====================================================
-- Table: a2p_campaign_phone_numbers
-- Associates phone numbers with campaigns (one number per campaign)
-- =====================================================
CREATE TABLE a2p_campaign_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES a2p_campaigns(id) ON DELETE CASCADE,
  phone_number_id UUID NOT NULL REFERENCES twilio_numbers(id) ON DELETE CASCADE,

  -- Assignment Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'active',
    'failed'
  )),

  -- Timestamps
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_campaign_phone_number UNIQUE (campaign_id, phone_number_id)
);

-- Indexes for a2p_campaign_phone_numbers
CREATE INDEX idx_a2p_campaign_numbers_campaign ON a2p_campaign_phone_numbers(campaign_id);
CREATE INDEX idx_a2p_campaign_numbers_phone ON a2p_campaign_phone_numbers(phone_number_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE a2p_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2p_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2p_campaign_phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for a2p_brands
CREATE POLICY "Users can view workspace brands"
  ON a2p_brands FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_brands.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert brands in their workspace"
  ON a2p_brands FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_brands.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace brands"
  ON a2p_brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_brands.workspace_id
      AND profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_brands.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete draft or rejected brands"
  ON a2p_brands FOR DELETE
  TO authenticated
  USING (
    status IN ('draft', 'rejected')
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_brands.workspace_id
      AND profile_id = auth.uid()
    )
  );

-- RLS Policies for a2p_campaigns
CREATE POLICY "Users can view workspace campaigns"
  ON a2p_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_campaigns.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert campaigns in their workspace"
  ON a2p_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_campaigns.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace campaigns"
  ON a2p_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_campaigns.workspace_id
      AND profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_campaigns.workspace_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete draft or rejected campaigns"
  ON a2p_campaigns FOR DELETE
  TO authenticated
  USING (
    status IN ('draft', 'rejected')
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = a2p_campaigns.workspace_id
      AND profile_id = auth.uid()
    )
  );

-- RLS Policies for a2p_campaign_phone_numbers
CREATE POLICY "Users can view campaign phone number assignments"
  ON a2p_campaign_phone_numbers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM a2p_campaigns c
      INNER JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = a2p_campaign_phone_numbers.campaign_id
      AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert campaign phone number assignments"
  ON a2p_campaign_phone_numbers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM a2p_campaigns c
      INNER JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = a2p_campaign_phone_numbers.campaign_id
      AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaign phone number assignments"
  ON a2p_campaign_phone_numbers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM a2p_campaigns c
      INNER JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = a2p_campaign_phone_numbers.campaign_id
      AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign phone number assignments"
  ON a2p_campaign_phone_numbers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM a2p_campaigns c
      INNER JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = a2p_campaign_phone_numbers.campaign_id
      AND wm.profile_id = auth.uid()
    )
  );

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

CREATE TRIGGER update_a2p_brands_updated_at
  BEFORE UPDATE ON a2p_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2p_campaigns_updated_at
  BEFORE UPDATE ON a2p_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2p_campaign_phone_numbers_updated_at
  BEFORE UPDATE ON a2p_campaign_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
