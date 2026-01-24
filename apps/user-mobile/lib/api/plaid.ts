import { del, get, post } from "../api";
import {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  LinkTokenResponse,
  PlaidAccountsResponse,
  PlaidSyncResponse,
} from "../types/finance";

export interface CreateLinkTokenInput {
  accessToken?: string;
}

/**
 * Create a Plaid Link token
 * Pass accessToken to update an existing connection (fix broken connection)
 */
export async function createLinkToken(
  input?: CreateLinkTokenInput
): Promise<LinkTokenResponse> {
  return post<LinkTokenResponse>("/api/plaid/link-token", input || {});
}

/**
 * Exchange Plaid public token for permanent access
 * Creates accounts in the database
 */
export async function exchangePublicToken(
  data: ExchangeTokenRequest
): Promise<ExchangeTokenResponse> {
  return post<ExchangeTokenResponse>("/api/plaid/exchange", data);
}

/**
 * Get all connected Plaid banks with their linked accounts
 */
export async function getPlaidAccounts(): Promise<PlaidAccountsResponse> {
  return get<PlaidAccountsResponse>("/api/plaid/accounts");
}

/**
 * Manually trigger transaction sync for a Plaid item
 */
export async function syncPlaidItem(
  plaidItemId: string
): Promise<PlaidSyncResponse> {
  return post<PlaidSyncResponse>("/api/plaid/sync", { plaidItemId });
}

/**
 * Disconnect a bank connection
 * Accounts are kept but unlinked from Plaid
 */
export async function disconnectBank(id: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/api/plaid/items/${id}`);
}
