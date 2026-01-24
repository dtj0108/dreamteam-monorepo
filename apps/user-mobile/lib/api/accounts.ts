import { del, get, post, put } from "../api";
import { Account, AccountTotals } from "../types/finance";

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

export async function getAccounts(): Promise<AccountsResponse> {
  return get<AccountsResponse>("/api/accounts");
}

export async function getAccount(id: string): Promise<Account> {
  return get<Account>(`/api/accounts/${id}`);
}

export async function createAccount(data: CreateAccountInput): Promise<Account> {
  return post<Account>("/api/accounts", data);
}

export async function updateAccount(
  id: string,
  data: UpdateAccountInput
): Promise<Account> {
  return put<Account>(`/api/accounts/${id}`, data);
}

export async function deleteAccount(id: string): Promise<void> {
  return del(`/api/accounts/${id}`);
}
