-- ============================================
-- Plaid Integration Tables
-- ============================================

-- Plaid Items (connected bank connections)
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plaid_item_id TEXT NOT NULL UNIQUE,
    plaid_access_token TEXT, -- Legacy: will be removed after migration
    encrypted_access_token TEXT NOT NULL,
    plaid_institution_id TEXT,
    institution_name TEXT,
    institution_logo TEXT,
    consent_expiration_time TIMESTAMPTZ,
    update_type TEXT DEFAULT 'background',
    status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'error', 'pending')),
    error_code TEXT,
    error_message TEXT,
    last_successful_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for plaid_items
CREATE INDEX IF NOT EXISTS idx_plaid_items_workspace_id ON plaid_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_plaid_item_id ON plaid_items(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

-- Plaid Sync Cursors (tracks transaction sync progress)
CREATE TABLE IF NOT EXISTS plaid_sync_cursors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
    cursor TEXT,
    has_more BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plaid_item_id)
);

-- Index for sync cursors
CREATE INDEX IF NOT EXISTS idx_plaid_sync_cursors_plaid_item_id ON plaid_sync_cursors(plaid_item_id);

-- ============================================
-- Extend accounts table with Plaid fields
-- ============================================

-- Add Plaid-related columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_mask TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_official_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_subtype TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_available_balance DECIMAL(19,4);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_current_balance DECIMAL(19,4);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_limit DECIMAL(19,4);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_plaid_linked BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_last_balance_update TIMESTAMPTZ;

-- Indexes for Plaid account lookups
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_account_id ON accounts(plaid_account_id) WHERE plaid_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_item_id ON accounts(plaid_item_id) WHERE plaid_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_is_plaid_linked ON accounts(is_plaid_linked) WHERE is_plaid_linked = true;

-- ============================================
-- Extend transactions table with Plaid fields
-- ============================================

-- Add Plaid-related columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_pending BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_merchant_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_category TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_payment_channel TEXT;

-- Index for Plaid transaction lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_plaid_transaction_id ON transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on Plaid tables
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_sync_cursors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plaid_items
CREATE POLICY "Users can view plaid items in their workspace"
    ON plaid_items FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create plaid items in their workspace"
    ON plaid_items FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own plaid items"
    ON plaid_items FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own plaid items"
    ON plaid_items FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for plaid_sync_cursors
CREATE POLICY "Users can view sync cursors for their plaid items"
    ON plaid_sync_cursors FOR SELECT
    USING (
        plaid_item_id IN (
            SELECT id FROM plaid_items WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sync cursors for their plaid items"
    ON plaid_sync_cursors FOR INSERT
    WITH CHECK (
        plaid_item_id IN (
            SELECT id FROM plaid_items WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sync cursors for their plaid items"
    ON plaid_sync_cursors FOR UPDATE
    USING (
        plaid_item_id IN (
            SELECT id FROM plaid_items WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- Updated_at triggers
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_plaid_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for plaid_items
DROP TRIGGER IF EXISTS trigger_plaid_items_updated_at ON plaid_items;
CREATE TRIGGER trigger_plaid_items_updated_at
    BEFORE UPDATE ON plaid_items
    FOR EACH ROW
    EXECUTE FUNCTION update_plaid_updated_at();

-- Trigger for plaid_sync_cursors
DROP TRIGGER IF EXISTS trigger_plaid_sync_cursors_updated_at ON plaid_sync_cursors;
CREATE TRIGGER trigger_plaid_sync_cursors_updated_at
    BEFORE UPDATE ON plaid_sync_cursors
    FOR EACH ROW
    EXECUTE FUNCTION update_plaid_updated_at();

-- ============================================
-- Service role policies (for backend API calls)
-- ============================================

-- Allow service role full access to plaid_items
CREATE POLICY "Service role has full access to plaid_items"
    ON plaid_items FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow service role full access to plaid_sync_cursors
CREATE POLICY "Service role has full access to plaid_sync_cursors"
    ON plaid_sync_cursors FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
