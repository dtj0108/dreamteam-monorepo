import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, WebhookVerificationKeyGetRequest, SandboxItemFireWebhookRequestWebhookCodeEnum } from 'plaid'
import * as jose from 'jose'

// ============================================
// Configuration
// ============================================

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'
const PLAID_WEBHOOK_URL = process.env.PLAID_WEBHOOK_URL

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(configuration)

// ============================================
// Result Types
// ============================================

export interface PlaidResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

export interface LinkTokenData {
  linkToken: string
  expiration: string
}

export interface ExchangeTokenData {
  accessToken: string
  itemId: string
}

export interface PlaidAccountData {
  accountId: string
  name: string
  officialName: string | null
  type: string
  subtype: string | null
  mask: string | null
  balances: {
    available: number | null
    current: number | null
    limit: number | null
  }
}

export interface PlaidInstitutionData {
  institutionId: string
  name: string
  logo: string | null
}

export interface PlaidTransactionData {
  transactionId: string
  accountId: string
  amount: number
  date: string
  name: string
  merchantName: string | null | undefined
  pending: boolean
  category: string[] | null | undefined
  paymentChannel: string
}

export interface TransactionSyncData {
  added: PlaidTransactionData[]
  modified: PlaidTransactionData[]
  removed: { transactionId: string }[]
  cursor: string
  hasMore: boolean
}

// ============================================
// Link Token Functions
// ============================================

/**
 * Create a Link token for initializing Plaid Link
 */
export async function createLinkToken(
  userId: string,
  clientName: string = 'dreamteam'
): Promise<PlaidResult<LinkTokenData>> {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: clientName,
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: PLAID_WEBHOOK_URL,
    })

    return {
      success: true,
      data: {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      },
    }
  } catch (error: unknown) {
    console.error('Failed to create link token:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to create link token',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

/**
 * Create an update Link token for fixing broken connections
 */
export async function createUpdateLinkToken(
  userId: string,
  accessToken: string,
  clientName: string = 'dreamteam'
): Promise<PlaidResult<LinkTokenData>> {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: clientName,
      country_codes: [CountryCode.Us],
      language: 'en',
      access_token: accessToken,
    })

    return {
      success: true,
      data: {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      },
    }
  } catch (error: unknown) {
    console.error('Failed to create update link token:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to create update link token',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Token Exchange Functions
// ============================================

/**
 * Exchange a public token for a permanent access token
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<PlaidResult<ExchangeTokenData>> {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    return {
      success: true,
      data: {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      },
    }
  } catch (error: unknown) {
    console.error('Failed to exchange public token:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to exchange token',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Account Functions
// ============================================

/**
 * Get accounts associated with an Item
 */
export async function getAccounts(
  accessToken: string
): Promise<PlaidResult<PlaidAccountData[]>> {
  try {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    const accounts = response.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balances: {
        available: account.balances.available,
        current: account.balances.current,
        limit: account.balances.limit,
      },
    }))

    return {
      success: true,
      data: accounts,
    }
  } catch (error: unknown) {
    console.error('Failed to get accounts:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to get accounts',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

/**
 * Get institution details by ID
 */
export async function getInstitution(
  institutionId: string
): Promise<PlaidResult<PlaidInstitutionData>> {
  try {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
      options: { include_optional_metadata: true },
    })

    return {
      success: true,
      data: {
        institutionId: response.data.institution.institution_id,
        name: response.data.institution.name,
        logo: response.data.institution.logo || null,
      },
    }
  } catch (error: unknown) {
    console.error('Failed to get institution:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to get institution',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Transaction Sync Functions
// ============================================

/**
 * Sync transactions using the incremental sync API
 * Returns added, modified, and removed transactions since the last cursor
 */
export async function syncTransactions(
  accessToken: string,
  cursor?: string | null
): Promise<PlaidResult<TransactionSyncData>> {
  try {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || undefined,
    })

    const added = response.data.added.map((tx) => ({
      transactionId: tx.transaction_id,
      accountId: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name,
      pending: tx.pending,
      category: tx.category,
      paymentChannel: tx.payment_channel,
    }))

    const modified = response.data.modified.map((tx) => ({
      transactionId: tx.transaction_id,
      accountId: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name,
      pending: tx.pending,
      category: tx.category,
      paymentChannel: tx.payment_channel,
    }))

    const removed = response.data.removed.map((tx) => ({
      transactionId: tx.transaction_id!,
    }))

    return {
      success: true,
      data: {
        added,
        modified,
        removed,
        cursor: response.data.next_cursor,
        hasMore: response.data.has_more,
      },
    }
  } catch (error: unknown) {
    console.error('Failed to sync transactions:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to sync transactions',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Item Management Functions
// ============================================

/**
 * Get Item details
 */
export async function getItem(accessToken: string) {
  try {
    const response = await plaidClient.itemGet({
      access_token: accessToken,
    })

    return {
      success: true,
      data: response.data,
    }
  } catch (error: unknown) {
    console.error('Failed to get item:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to get item',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

/**
 * Remove an Item (disconnect bank)
 */
export async function removeItem(accessToken: string): Promise<PlaidResult<void>> {
  try {
    await plaidClient.itemRemove({
      access_token: accessToken,
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('Failed to remove item:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to remove item',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Map Plaid account type/subtype to our account_type enum
 */
export function mapPlaidAccountType(plaidType: string, plaidSubtype: string | null): string {
  // Direct subtype mappings
  if (plaidSubtype) {
    const subtypeMap: Record<string, string> = {
      'checking': 'checking',
      'savings': 'savings',
      'credit card': 'credit_card',
      'cd': 'savings',
      'money market': 'savings',
      'paypal': 'cash',
      'prepaid': 'cash',
      '401k': 'investment',
      '401a': 'investment',
      'ira': 'investment',
      'roth': 'investment',
      'brokerage': 'investment',
      'student': 'loan',
      'mortgage': 'loan',
      'auto': 'loan',
      'personal': 'loan',
    }

    const mapped = subtypeMap[plaidSubtype.toLowerCase()]
    if (mapped) return mapped
  }

  // Fallback to type-level mapping
  const typeMap: Record<string, string> = {
    'depository': 'checking',
    'credit': 'credit_card',
    'loan': 'loan',
    'investment': 'investment',
  }

  return typeMap[plaidType.toLowerCase()] || 'other'
}

/**
 * Get the current Plaid environment
 */
export function getPlaidEnvironment(): string {
  return PLAID_ENV
}

/**
 * Check if Plaid is configured
 */
export function isPlaidConfigured(): boolean {
  return !!(PLAID_CLIENT_ID && PLAID_SECRET)
}

/**
 * Fire a sandbox webhook to trigger initial transactions (Sandbox only)
 * Call this after linking to populate test transaction data
 */
export async function fireSandboxWebhook(
  accessToken: string,
  webhookCode: SandboxItemFireWebhookRequestWebhookCodeEnum = SandboxItemFireWebhookRequestWebhookCodeEnum.DefaultUpdate
): Promise<PlaidResult<void>> {
  if (PLAID_ENV !== 'sandbox') {
    return { success: false, error: 'Sandbox webhooks only available in sandbox environment' }
  }

  try {
    await plaidClient.sandboxItemFireWebhook({
      access_token: accessToken,
      webhook_code: webhookCode,
    })
    return { success: true }
  } catch (error: unknown) {
    console.error('Failed to fire sandbox webhook:', error)
    const plaidError = error as { response?: { data?: { error_message?: string; error_code?: string } } }
    return {
      success: false,
      error: plaidError.response?.data?.error_message || 'Failed to fire sandbox webhook',
      errorCode: plaidError.response?.data?.error_code,
    }
  }
}

// ============================================
// Webhook Verification
// ============================================

// Cache for Plaid's public keys (they rotate infrequently)
const keyCache = new Map<string, { key: jose.KeyLike | Uint8Array; expires: number }>()
const KEY_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get a Plaid webhook verification key by key_id
 * Keys are cached for 24 hours to reduce API calls
 */
async function getWebhookVerificationKey(keyId: string): Promise<jose.KeyLike | Uint8Array | null> {
  // Check cache first
  const cached = keyCache.get(keyId)
  if (cached && cached.expires > Date.now()) {
    return cached.key
  }

  try {
    const request: WebhookVerificationKeyGetRequest = { key_id: keyId }
    const response = await plaidClient.webhookVerificationKeyGet(request)
    const jwk = response.data.key

    // Import the JWK
    const key = await jose.importJWK(jwk, 'ES256')

    // Cache the key
    keyCache.set(keyId, {
      key,
      expires: Date.now() + KEY_CACHE_TTL,
    })

    return key
  } catch (error) {
    console.error('Failed to get webhook verification key:', error)
    return null
  }
}

/**
 * Verify a Plaid webhook signature
 *
 * @param body - The raw request body as a string
 * @param plaidVerification - The Plaid-Verification header value (JWT)
 * @returns true if the webhook is valid, false otherwise
 */
export async function verifyWebhookSignature(
  body: string,
  plaidVerification: string | null
): Promise<{ valid: boolean; error?: string }> {
  if (!plaidVerification) {
    return { valid: false, error: 'Missing Plaid-Verification header' }
  }

  try {
    // Decode the JWT header to get the key_id
    const decodedHeader = jose.decodeProtectedHeader(plaidVerification)
    const keyId = decodedHeader.kid

    if (!keyId) {
      return { valid: false, error: 'Missing key_id in JWT header' }
    }

    // Get the public key
    const publicKey = await getWebhookVerificationKey(keyId)
    if (!publicKey) {
      return { valid: false, error: 'Failed to fetch public key' }
    }

    // Verify the JWT
    const { payload } = await jose.jwtVerify(plaidVerification, publicKey, {
      maxTokenAge: '5 minutes', // Plaid JWTs are only valid for 5 minutes
    })

    // Verify the request body hash matches
    // Plaid includes a SHA-256 hash of the body in the JWT
    const bodyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(body)
    )
    const bodyHashHex = Array.from(new Uint8Array(bodyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (payload.request_body_sha256 !== bodyHashHex) {
      return { valid: false, error: 'Request body hash mismatch' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Webhook verification failed:', error)
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'JWT expired' }
    }
    if (error instanceof jose.errors.JWTInvalid) {
      return { valid: false, error: 'Invalid JWT' }
    }
    return { valid: false, error: 'Verification failed' }
  }
}
