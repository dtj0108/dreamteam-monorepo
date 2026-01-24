import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BulkDeleteInput,
  BulkDeleteResponse,
  BulkUpdateInput,
  BulkUpdateResponse,
  CategorizeResponse,
  CreateTransactionInput,
  DuplicateCheckInput,
  DuplicateCheckResponse,
  ImportResponse,
  ImportTransactionsInput,
  TransactionFilters,
  TransactionsResponse,
  UpdateTransactionInput,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  categorizeTransactions,
  checkDuplicates,
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  importTransactions,
  updateTransaction,
} from "../api/transactions";
import { Transaction } from "../types/finance";
import { accountKeys } from "./useAccounts";

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionsResponse>({
    queryKey: transactionKeys.list(filters),
    queryFn: () => getTransactions(filters),
  });
}

export function useTransaction(id: string) {
  return useQuery<Transaction>({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionInput) => createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      // Also invalidate accounts since balance may have changed
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      updateTransaction(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * AI-powered transaction categorization
 * Returns category suggestions for a list of transaction descriptions
 */
export function useCategorizeTransactions() {
  return useMutation<CategorizeResponse, Error, string[]>({
    mutationFn: (descriptions) => categorizeTransactions(descriptions),
  });
}

/**
 * Bulk update transactions (e.g., assign category to multiple)
 */
export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient();

  return useMutation<BulkUpdateResponse, Error, BulkUpdateInput>({
    mutationFn: (data) => bulkUpdateTransactions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

/**
 * Bulk delete transactions
 */
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteResponse, Error, BulkDeleteInput>({
    mutationFn: (data) => bulkDeleteTransactions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * Import multiple transactions at once
 */
export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation<ImportResponse, Error, ImportTransactionsInput>({
    mutationFn: (data) => importTransactions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * Check for duplicate transactions before import
 */
export function useCheckDuplicates() {
  return useMutation<DuplicateCheckResponse, Error, DuplicateCheckInput>({
    mutationFn: (data) => checkDuplicates(data),
  });
}
