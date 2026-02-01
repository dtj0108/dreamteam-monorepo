import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { post } from "../api";
import { Transaction } from "../types/finance";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

// ============================================================================
// Helper Functions
// ============================================================================

async function getWorkspaceId(): Promise<string> {
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);
  if (!workspaceId) {
    throw new Error("No workspace selected");
  }
  return workspaceId;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Transactions CRUD (Converted to Supabase)
// ============================================================================

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionsResponse> {
  console.log("[Transactions API] getTransactions via Supabase", filters);
  try {
    const workspaceId = await getWorkspaceId();

    // Get accounts in this workspace first
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (accountsError) throw accountsError;

    const accountIds = (accounts || []).map(a => a.id);

    if (accountIds.length === 0) {
      return { transactions: [], total: 0 };
    }

    let query = supabase
      .from("transactions")
      .select(`
        *,
        category:categories(id, name, type, icon, color),
        account:accounts(id, name, type)
      `)
      .in("account_id", accountIds)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.accountId) {
      query = query.eq("account_id", filters.accountId);
    }
    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }
    if (filters.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("date", filters.endDate);
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    const transactions = (data || []) as Transaction[];

    console.log("[Transactions API] getTransactions response:", transactions.length, "transactions");
    return { transactions, total: transactions.length };
  } catch (error) {
    console.error("[Transactions API] getTransactions ERROR:", error);
    throw error;
  }
}

export async function getTransaction(id: string): Promise<Transaction> {
  console.log("[Transactions API] getTransaction via Supabase", id);
  try {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select(`
        *,
        category:categories(id, name, type, icon, color),
        account:accounts(id, name, type)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Transactions API] getTransaction response:", transaction.description);
    return transaction as Transaction;
  } catch (error) {
    console.error("[Transactions API] getTransaction ERROR:", error);
    throw error;
  }
}

export async function createTransaction(
  data: CreateTransactionInput
): Promise<Transaction> {
  console.log("[Transactions API] createTransaction via Supabase", data);
  try {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        account_id: data.account_id,
        category_id: data.category_id || null,
        amount: data.amount,
        date: data.date,
        description: data.description,
        notes: data.notes || null,
        is_transfer: data.is_transfer ?? false,
      })
      .select(`
        *,
        category:categories(id, name, type, icon, color),
        account:accounts(id, name, type)
      `)
      .single();

    if (error) throw error;

    console.log("[Transactions API] createTransaction response:", transaction);
    return transaction as Transaction;
  } catch (error) {
    console.error("[Transactions API] createTransaction ERROR:", error);
    throw error;
  }
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionInput
): Promise<Transaction> {
  console.log("[Transactions API] updateTransaction via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.account_id !== undefined) updateData.account_id = data.account_id;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: transaction, error } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:categories(id, name, type, icon, color),
        account:accounts(id, name, type)
      `)
      .single();

    if (error) throw error;

    console.log("[Transactions API] updateTransaction response:", transaction);
    return transaction as Transaction;
  } catch (error) {
    console.error("[Transactions API] updateTransaction ERROR:", error);
    throw error;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  console.log("[Transactions API] deleteTransaction via Supabase", id);
  try {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Transactions API] deleteTransaction success");
  } catch (error) {
    console.error("[Transactions API] deleteTransaction ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Bulk Operations (Converted to Supabase)
// ============================================================================

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
  console.log("[Transactions API] bulkUpdateTransactions via Supabase", data);
  try {
    const { error } = await supabase
      .from("transactions")
      .update({
        category_id: data.category_id,
        updated_at: new Date().toISOString(),
      })
      .in("id", data.transaction_ids);

    if (error) throw error;

    console.log("[Transactions API] bulkUpdateTransactions success:", data.transaction_ids.length, "updated");
    return { success: true, updated: data.transaction_ids.length };
  } catch (error) {
    console.error("[Transactions API] bulkUpdateTransactions ERROR:", error);
    throw error;
  }
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
  console.log("[Transactions API] bulkDeleteTransactions via Supabase", data);
  try {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", data.transaction_ids);

    if (error) throw error;

    console.log("[Transactions API] bulkDeleteTransactions success:", data.transaction_ids.length, "deleted");
    return { success: true, deleted: data.transaction_ids.length };
  } catch (error) {
    console.error("[Transactions API] bulkDeleteTransactions ERROR:", error);
    throw error;
  }
}

// ============================================================================
// AI/Backend Operations (Keep as HTTP - requires server-side processing)
// ============================================================================

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
