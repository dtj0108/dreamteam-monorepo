import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { Account, AccountTotals } from "../types/finance";

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

export interface AccountsResponse {
  accounts: Account[];
  totals: AccountTotals;
}

export interface CreateAccountInput {
  name: string;
  type: Account["type"];
  balance?: number;
  institution?: string;
  last_four?: string;
  currency?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: Account["type"];
  balance?: number;
  institution?: string;
  last_four?: string;
  is_active?: boolean;
}

// ============================================================================
// Accounts CRUD
// ============================================================================

export async function getAccounts(): Promise<AccountsResponse> {
  console.log("[Accounts API] getAccounts via Supabase");
  try {
    const workspaceId = await getWorkspaceId();

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Calculate totals client-side
    let assets = 0;
    let liabilities = 0;

    (accounts || []).forEach((account: Account) => {
      const balance = account.balance || 0;

      // Credit cards and loans are liabilities (balances typically negative or treated as debt)
      if (account.type === "credit_card" || account.type === "loan") {
        liabilities += Math.abs(balance);
      } else {
        // Checking, savings, cash, investment are assets
        assets += balance;
      }
    });

    const totals: AccountTotals = {
      assets,
      liabilities,
      netWorth: assets - liabilities,
    };

    console.log("[Accounts API] getAccounts response:", (accounts || []).length, "accounts");
    return { accounts: accounts || [], totals };
  } catch (error) {
    console.error("[Accounts API] getAccounts ERROR:", error);
    throw error;
  }
}

export async function getAccount(id: string): Promise<Account> {
  console.log("[Accounts API] getAccount via Supabase", id);
  try {
    const { data: account, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Accounts API] getAccount response:", account.name);
    return account;
  } catch (error) {
    console.error("[Accounts API] getAccount ERROR:", error);
    throw error;
  }
}

export async function createAccount(data: CreateAccountInput): Promise<Account> {
  console.log("[Accounts API] createAccount via Supabase", data);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        name: data.name,
        type: data.type,
        balance: data.balance ?? 0,
        institution: data.institution || null,
        last_four: data.last_four || null,
        currency: data.currency || "USD",
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Accounts API] createAccount response:", account);
    return account;
  } catch (error) {
    console.error("[Accounts API] createAccount ERROR:", error);
    throw error;
  }
}

export async function updateAccount(
  id: string,
  data: UpdateAccountInput
): Promise<Account> {
  console.log("[Accounts API] updateAccount via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.balance !== undefined) updateData.balance = data.balance;
    if (data.institution !== undefined) updateData.institution = data.institution;
    if (data.last_four !== undefined) updateData.last_four = data.last_four;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: account, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[Accounts API] updateAccount response:", account);
    return account;
  } catch (error) {
    console.error("[Accounts API] updateAccount ERROR:", error);
    throw error;
  }
}

export async function deleteAccount(id: string): Promise<void> {
  console.log("[Accounts API] deleteAccount via Supabase", id);
  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("accounts")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    console.log("[Accounts API] deleteAccount success");
  } catch (error) {
    console.error("[Accounts API] deleteAccount ERROR:", error);
    throw error;
  }
}
