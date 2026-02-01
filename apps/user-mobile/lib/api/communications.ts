import { supabase } from "../supabase";
import {
  Communication,
  CommunicationsQueryParams,
} from "../types/sales";

// ============================================================================
// Communications API (Twilio calls, SMS)
// ============================================================================

/**
 * Get communications for a lead or contact
 * Uses web API first (bypasses RLS), falls back to Supabase
 */
export async function getCommunications(
  params?: CommunicationsQueryParams
): Promise<Communication[]> {
  console.log("[Communications API] getCommunications", params);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // If API_URL is configured, use the web API which bypasses RLS
    if (API_URL) {
      try {
        console.log("[Communications API] getCommunications via API");
        const { data: { session } } = await supabase.auth.getSession();

        // Build query params
        const queryParams = new URLSearchParams();
        if (params?.leadId) {
          queryParams.append("leadId", params.leadId);
        }
        if (params?.contactId) {
          queryParams.append("contactId", params.contactId);
        }
        if (params?.type) {
          queryParams.append("type", params.type);
        }
        if (params?.limit) {
          queryParams.append("limit", params.limit.toString());
        }
        if (params?.offset) {
          queryParams.append("offset", params.offset.toString());
        }

        const response = await fetch(
          `${API_URL}/api/communications?${queryParams.toString()}`,
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
          const communications = (data || []) as Communication[];
          console.log(
            "[Communications API] getCommunications via API response:",
            communications.length,
            "communications"
          );
          return communications;
        }
        // If API call fails, fall through to Supabase fallback
        console.warn("[Communications API] API call failed, falling back to Supabase");
      } catch (apiError) {
        console.warn("[Communications API] API call error, falling back to Supabase:", apiError);
      }
    }

    // Fallback: Direct Supabase query (subject to RLS)
    console.log("[Communications API] getCommunications via Supabase fallback");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    let query = supabase
      .from("communications")
      .select(`
        *,
        recordings:call_recordings(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (params?.leadId) {
      query = query.eq("lead_id", params.leadId);
    }
    if (params?.contactId) {
      query = query.eq("contact_id", params.contactId);
    }
    if (params?.type) {
      query = query.eq("type", params.type);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    const communications = (data || []) as Communication[];
    console.log(
      "[Communications API] getCommunications response:",
      communications.length,
      "communications"
    );
    return communications;
  } catch (error) {
    console.error("[Communications API] getCommunications ERROR:", error);
    throw error;
  }
}

/**
 * Get communications for a specific lead
 * Convenience wrapper for getCommunications
 */
export async function getLeadCommunications(leadId: string): Promise<Communication[]> {
  return getCommunications({ leadId });
}
