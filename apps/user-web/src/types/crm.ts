/**
 * CRM Integration Types
 * Supports API key-based integrations for Close, Pipedrive, HubSpot, and Freshsales
 */

// CRMs that support API key authentication
export type CRMProvider = 'close' | 'pipedrive' | 'hubspot' | 'freshsales'

export type CRMIntegrationStatus = 'active' | 'error' | 'disconnected'

/**
 * CRM Integration record from database
 */
export interface CRMIntegration {
  id: string
  workspace_id: string
  user_id: string
  provider: CRMProvider
  name: string | null
  status: CRMIntegrationStatus
  external_account_id: string | null
  external_account_name: string | null
  scopes: string[] | null
  last_sync_at: string | null
  error_code: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Note: encrypted API key is never returned to client
}

/**
 * Provider configuration for API key auth
 */
export interface CRMProviderConfig {
  id: CRMProvider
  name: string
  description: string
  color: string
  // API configuration
  baseUrl: string
  // Instructions for finding API key
  apiKeyInstructions: string[]
  apiKeyPlaceholder: string
  settingsUrl: string
}

/**
 * API key providers with their configurations
 */
export const CRM_PROVIDERS: Record<CRMProvider, CRMProviderConfig> = {
  close: {
    id: 'close',
    name: 'Close',
    description: 'Import leads, contacts, and opportunities from Close CRM',
    color: '#2c3e50',
    baseUrl: 'https://api.close.com/api/v1',
    apiKeyInstructions: [
      'Log into Close at app.close.com',
      'Go to Settings → API Keys',
      'Click "Generate New API Key"',
      'Copy and paste it below',
    ],
    apiKeyPlaceholder: 'api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    settingsUrl: 'https://app.close.com/settings/api/',
  },
  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Import organizations, contacts, and deals from Pipedrive',
    color: '#017737',
    baseUrl: 'https://api.pipedrive.com/v1',
    apiKeyInstructions: [
      'Log into Pipedrive',
      'Go to Settings → Personal Preferences → API',
      'Copy your API token',
      'Paste it below',
    ],
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    settingsUrl: 'https://app.pipedrive.com/settings/api',
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Import companies, contacts, and deals from HubSpot',
    color: '#ff7a59',
    baseUrl: 'https://api.hubapi.com',
    apiKeyInstructions: [
      'Log into HubSpot',
      'Go to Settings → Integrations → Private Apps',
      'Create a new private app (or use existing)',
      'Copy the access token and paste it below',
    ],
    apiKeyPlaceholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    settingsUrl: 'https://app.hubspot.com/private-apps/',
  },
  freshsales: {
    id: 'freshsales',
    name: 'Freshsales',
    description: 'Import accounts, contacts, and deals from Freshsales',
    color: '#13ae5c',
    baseUrl: 'https://domain.freshsales.io/api',
    apiKeyInstructions: [
      'Log into Freshsales',
      'Click your profile icon → Settings',
      'Go to API Settings',
      'Copy your API key and paste it below',
    ],
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    settingsUrl: 'https://support.freshsales.io/en/support/solutions/articles/50000002503',
  },
}

/**
 * Get all provider IDs as array
 */
export const CRM_PROVIDER_IDS = Object.keys(CRM_PROVIDERS) as CRMProvider[]

/**
 * Data counts from CRM for import preview
 */
export interface CRMDataCounts {
  leads: number
  contacts: number
  opportunities: number
  tasks?: number
  // Note about contacts if they're embedded (e.g., Close CRM)
  contactsNote?: string
}

/**
 * Import filter options
 */
export interface CRMImportFilters {
  // Date filter - only import records created after this date
  createdAfter?: string // ISO date string
  // Lead status filter (Close: status_label, Pipedrive: status)
  leadStatuses?: string[]
  // Opportunity status filter
  opportunityStatuses?: string[]
  // Limit the number of records to import
  limit?: number
}

/**
 * Import options selected by user
 */
export interface CRMImportOptions {
  leads: boolean
  contacts: boolean
  opportunities: boolean
  tasks?: boolean
  skipDuplicates: boolean
  filters?: CRMImportFilters
}

/**
 * Import result summary
 */
export interface CRMImportResult {
  leads: { imported: number; skipped: number; failed: number }
  contacts: { imported: number; skipped: number; failed: number }
  opportunities: { imported: number; skipped: number; failed: number }
  tasks?: { imported: number; skipped: number; failed: number }
  errors: string[]
}
