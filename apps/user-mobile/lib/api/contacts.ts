import { del, get, post, put } from "../api";
import {
  Contact,
  ContactsResponse,
  CreateContactInput,
  UpdateContactInput,
} from "../types/sales";

export interface ContactsQueryParams {
  lead_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Contacts CRUD
export async function getContacts(params?: ContactsQueryParams): Promise<ContactsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.lead_id) searchParams.append("lead_id", params.lead_id);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const query = searchParams.toString();
  const url = query ? `/api/contacts?${query}` : "/api/contacts";
  return get<ContactsResponse>(url);
}

export async function getContact(id: string): Promise<Contact> {
  return get<Contact>(`/api/contacts/${id}`);
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  return post<Contact>("/api/contacts", data);
}

export async function updateContact(
  id: string,
  data: Omit<UpdateContactInput, "id">
): Promise<Contact> {
  return put<Contact>(`/api/contacts/${id}`, data);
}

export async function deleteContact(id: string): Promise<void> {
  return del(`/api/contacts/${id}`);
}
