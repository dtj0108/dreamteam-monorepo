import { del, get, post, put } from "../api";
import { Transaction } from "../types/finance";

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total?: number;
}

export interface CreateTransactionInput {
  account_id: string;
  category_id?: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  is_transfer?: boolean;
}

export interface UpdateTransactionInput {
  account_id?: string;
  category_id?: string;
  amount?: number;
  date?: string;
  description?: string;
  notes?: string;
}

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.accountId) params.append("accountId", filters.accountId);
  if (filters.categoryId) params.append("categoryId", filters.categoryId);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.offset) params.append("offset", filters.offset.toString());
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionsResponse> {
  const query = buildQueryString(filters);
  return get<TransactionsResponse>(`/api/transactions${query}`);
}

export async function getTransaction(id: string): Promise<Transaction> {
  return get<Transaction>(`/api/transactions/${id}`);
}

export async function createTransaction(
  data: CreateTransactionInput
): Promise<Transaction> {
  return post<Transaction>("/api/transactions", data);
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionInput
): Promise<Transaction> {
  return put<Transaction>(`/api/transactions/${id}`, data);
}

export async function deleteTransaction(id: string): Promise<void> {
  return del(`/api/transactions/${id}`);
}

// AI Categorization
export interface CategorizeSuggestion {
  description: string;
  categoryId: string;
  categoryName: string;
  confidence: "high" | "medium" | "low";
}

export interface CategorizeResponse {
  success: boolean;
  suggestions: CategorizeSuggestion[];
  categoriesUsed: number;
}

export async function categorizeTransactions(
  descriptions: string[]
): Promise<CategorizeResponse> {
  return post<CategorizeResponse>("/api/transactions/categorize", {
    descriptions,
  });
}

// Bulk Operations
export interface BulkUpdateInput {
  transaction_ids: string[];
  category_id: string;
}

export interface BulkUpdateResponse {
  success: boolean;
  updated: number;
}

export async function bulkUpdateTransactions(
  data: BulkUpdateInput
): Promise<BulkUpdateResponse> {
  return post<BulkUpdateResponse>("/api/transactions/bulk-update", data);
}

export interface BulkDeleteInput {
  transaction_ids: string[];
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted: number;
}

export async function bulkDeleteTransactions(
  data: BulkDeleteInput
): Promise<BulkDeleteResponse> {
  return post<BulkDeleteResponse>("/api/transactions/bulk-delete", data);
}

// Import
export interface ImportTransactionInput {
  date: string;
  amount: number;
  description: string;
  notes?: string;
  category_id?: string;
}

export interface ImportTransactionsInput {
  account_id: string;
  skip_duplicates?: boolean;
  transactions: ImportTransactionInput[];
}

export interface ImportResponse {
  success: boolean;
  imported: number;
  total: number;
  failed: number;
  skipped_duplicates: number;
  account: string;
}

export async function importTransactions(
  data: ImportTransactionsInput
): Promise<ImportResponse> {
  return post<ImportResponse>("/api/transactions/import", data);
}

// Duplicate Check
export interface DuplicateCheckInput {
  account_id: string;
  transactions: Array<{
    date: string;
    amount: number;
    description: string;
  }>;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarity: number;
  matchedTransaction: Transaction | null;
}

export interface DuplicateCheckResponse {
  results: DuplicateCheckResult[];
  duplicateCount: number;
  totalChecked: number;
}

export async function checkDuplicates(
  data: DuplicateCheckInput
): Promise<DuplicateCheckResponse> {
  return post<DuplicateCheckResponse>("/api/transactions/check-duplicates", data);
}
