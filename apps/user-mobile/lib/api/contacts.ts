import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import {
  Contact,
  ContactsResponse,
  CreateContactInput,
  UpdateContactInput,
} from "../types/sales";

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
// Query Parameters
// ============================================================================

export interface ContactsQueryParams {
  lead_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Contacts CRUD
// ============================================================================

export async function getContacts(params?: ContactsQueryParams): Promise<ContactsResponse> {
  console.log("[Contacts API] getContacts", params);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    const workspaceId = await getWorkspaceId();

    // If API_URL is configured, use the web API which bypasses RLS
    // This ensures all workspace contacts are visible, not just current user's
    if (API_URL) {
      try {
        console.log("[Contacts API] getContacts via API");
        const { data: { session } } = await supabase.auth.getSession();

        // Build query params
        const queryParams = new URLSearchParams();
        queryParams.append("workspaceId", workspaceId);
        if (params?.lead_id) {
          queryParams.append("lead_id", params.lead_id);
        }
        if (params?.search) {
          queryParams.append("search", params.search);
        }

        const response = await fetch(
          `${API_URL}/api/contacts?${queryParams.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: session ? `Bearer ${session.access_token}` : "",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // API returns array directly
          const contacts = (data || []) as Contact[];
          console.log("[Contacts API] getContacts via API response:", contacts.length, "contacts");
          return { contacts, total: contacts.length };
        }
        // If API call fails, fall through to Supabase fallback
        console.warn("[Contacts API] API call failed, falling back to Supabase");
      } catch (apiError) {
        console.warn("[Contacts API] API call error, falling back to Supabase:", apiError);
      }
    }

    // Fallback: Direct Supabase query (subject to RLS - may show fewer contacts)
    console.log("[Contacts API] getContacts via Supabase fallback");

    // First, get all leads in this workspace to filter contacts
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (leadsError) throw leadsError;

    const leadIds = (leads || []).map(l => l.id);

    if (leadIds.length === 0) {
      return { contacts: [], total: 0 };
    }

    let query = supabase
      .from("contacts")
      .select(`
        *,
        lead:leads(id, name)
      `)
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    // Filter by specific lead if provided
    if (params?.lead_id) {
      query = query.eq("lead_id", params.lead_id);
    }

    // Search by name or email
    if (params?.search) {
      query = query.or(
        `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
      );
    }

    // Pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    const contacts = (data || []) as Contact[];

    console.log("[Contacts API] getContacts response:", contacts.length, "contacts");
    return { contacts, total: contacts.length };
  } catch (error) {
    console.error("[Contacts API] getContacts ERROR:", error);
    throw error;
  }
}

export async function getContact(id: string): Promise<Contact> {
  console.log("[Contacts API] getContact", id);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // If API_URL is configured, use the web API which bypasses RLS
    if (API_URL) {
      try {
        console.log("[Contacts API] getContact via API");
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${API_URL}/api/contacts/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: session ? `Bearer ${session.access_token}` : "",
            },
          }
        );

        if (response.ok) {
          const contact = await response.json();
          console.log("[Contacts API] getContact via API response:", contact.first_name);
          return contact as Contact;
        }
        // If API call fails, fall through to Supabase fallback
        console.warn("[Contacts API] API call failed, falling back to Supabase");
      } catch (apiError) {
        console.warn("[Contacts API] API call error, falling back to Supabase:", apiError);
      }
    }

    // Fallback: Direct Supabase query (subject to RLS)
    console.log("[Contacts API] getContact via Supabase fallback");
    const { data: contact, error } = await supabase
      .from("contacts")
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Contacts API] getContact response:", contact.first_name);
    return contact as Contact;
  } catch (error) {
    console.error("[Contacts API] getContact ERROR:", error);
    throw error;
  }
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  console.log("[Contacts API] createContact via Supabase", data);
  try {
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        lead_id: data.lead_id,
        first_name: data.first_name,
        last_name: data.last_name || null,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        notes: data.notes || null,
      })
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single();

    if (error) throw error;

    console.log("[Contacts API] createContact response:", contact);
    return contact as Contact;
  } catch (error) {
    console.error("[Contacts API] createContact ERROR:", error);
    throw error;
  }
}

export async function updateContact(
  id: string,
  data: Omit<UpdateContactInput, "id">
): Promise<Contact> {
  console.log("[Contacts API] updateContact via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: contact, error } = await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        lead:leads(id, name)
      `)
      .single();

    if (error) throw error;

    console.log("[Contacts API] updateContact response:", contact);
    return contact as Contact;
  } catch (error) {
    console.error("[Contacts API] updateContact ERROR:", error);
    throw error;
  }
}

export async function deleteContact(id: string): Promise<void> {
  console.log("[Contacts API] deleteContact via Supabase", id);
  try {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Contacts API] deleteContact success");
  } catch (error) {
    console.error("[Contacts API] deleteContact ERROR:", error);
    throw error;
  }
}
