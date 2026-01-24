import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateLinkTokenInput,
  createLinkToken,
  disconnectBank,
  exchangePublicToken,
  getPlaidAccounts,
  syncPlaidItem,
} from "../api/plaid";
import {
  ExchangeTokenRequest,
  LinkTokenResponse,
  PlaidAccountsResponse,
  PlaidSyncResponse,
} from "../types/finance";
import { accountKeys } from "./useAccounts";

export const plaidKeys = {
  all: ["plaid"] as const,
  items: () => [...plaidKeys.all, "items"] as const,
};

/**
 * Fetch all connected Plaid banks with their linked accounts
 */
export function usePlaidAccounts() {
  return useQuery<PlaidAccountsResponse>({
    queryKey: plaidKeys.items(),
    queryFn: getPlaidAccounts,
  });
}

/**
 * Create a Plaid Link token
 * Use for initiating new connections or fixing broken ones
 */
export function useCreateLinkToken() {
  return useMutation<LinkTokenResponse, Error, CreateLinkTokenInput | undefined>({
    mutationFn: (input) => createLinkToken(input),
  });
}

/**
 * Exchange Plaid public token for permanent access
 * Automatically refreshes accounts and plaid items on success
 */
export function useExchangeToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExchangeTokenRequest) => exchangePublicToken(data),
    onSuccess: () => {
      // Refresh both accounts and plaid items
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plaidKeys.items() });
    },
  });
}

/**
 * Manually sync transactions for a Plaid item
 */
export function useSyncPlaidItem() {
  const queryClient = useQueryClient();

  return useMutation<PlaidSyncResponse, Error, string>({
    mutationFn: (plaidItemId: string) => syncPlaidItem(plaidItemId),
    onSuccess: () => {
      // Refresh accounts (balances may have changed) and plaid items (last sync time)
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plaidKeys.items() });
    },
  });
}

/**
 * Disconnect a bank from Plaid
 * Accounts are preserved but unlinked
 */
export function useDisconnectBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disconnectBank(id),
    onSuccess: () => {
      // Refresh both accounts and plaid items
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: plaidKeys.items() });
    },
  });
}
