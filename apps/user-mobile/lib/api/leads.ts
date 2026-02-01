import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { get } from "../api";
import {
  Lead,
  LeadWithRelations,
  LeadsResponse,
  CreateLeadInput,
  UpdateLeadInput,
  LeadTask,
  CreateLeadTaskInput,
  UpdateLeadTaskInput,
  LeadOpportunity,
  CreateLeadOpportunityInput,
  UpdateLeadOpportunityInput,
  MoveLeadStageInput,
  Activity,
} from "../types/sales";

export interface LeadsQueryParams {
  status?: string;
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  limit?: number;
  offset?: number;
}

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
// Leads CRUD
// ============================================================================

export async function getLeads(params?: LeadsQueryParams): Promise<LeadsResponse> {
  console.log("[Leads API] getLeads", params);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // If API_URL is configured, use the web API which bypasses RLS
    // This ensures all workspace leads are visible, not just current user's
    if (API_URL) {
      console.log("[Leads API] getLeads via API");
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = await getWorkspaceId();

      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append("workspaceId", workspaceId);
      if (params?.status && params.status !== "all") {
        queryParams.append("status", params.status);
      }
      if (params?.search) {
        queryParams.append("search", params.search);
      }
      if (params?.pipeline_id) {
        queryParams.append("pipeline_id", params.pipeline_id);
      }
      if (params?.stage_id) {
        queryParams.append("stage_id", params.stage_id);
      }
      if (params?.limit) {
        queryParams.append("limit", params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append("offset", params.offset.toString());
      }

      const response = await fetch(
        `${API_URL}/api/leads?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: session ? `Bearer ${session.access_token}` : "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Transform to match expected format
        const leads = (data || []).map((lead: any) => ({
          ...lead,
          contactCount: lead.contacts?.length || lead.contactCount || 0,
          stage: lead.stage || undefined,
        })) as Lead[];
        console.log("[Leads API] getLeads via API response:", leads.length, "leads");
        return { leads, total: leads.length };
      }
      // If API call fails, fall through to Supabase fallback
      console.log("[Leads API] API call failed, falling back to Supabase");
    }

    // Fallback: Direct Supabase query (subject to RLS - may show fewer leads)
    console.log("[Leads API] getLeads via Supabase fallback");
    const workspaceId = await getWorkspaceId();

    let query = supabase
      .from("leads")
      .select(`
        *,
        contacts:contacts(count),
        stage:lead_pipeline_stages(id, name, color, position)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }
    if (params?.pipeline_id) {
      query = query.eq("pipeline_id", params.pipeline_id);
    }
    if (params?.stage_id) {
      query = query.eq("stage_id", params.stage_id);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform the data to match expected format
    const leads = (data || []).map((lead: any) => ({
      ...lead,
      contactCount: lead.contacts?.[0]?.count || 0,
      stage: lead.stage || undefined,
    })) as Lead[];

    console.log("[Leads API] getLeads via Supabase response:", leads.length, "leads");
    return { leads, total: leads.length };
  } catch (error) {
    console.error("[Leads API] getLeads ERROR:", error);
    throw error;
  }
}

export async function getLead(id: string): Promise<LeadWithRelations> {
  console.log("[Leads API] getLead", id);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    
    // If API_URL is configured, use the web API which bypasses RLS
    // This ensures activities from all team members are visible
    if (API_URL) {
      console.log("[Leads API] getLead via API");
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = await getWorkspaceId();
      
      const url = new URL(`${API_URL}/api/leads/${id}`);
      url.searchParams.append("workspaceId", workspaceId);
      
      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          Authorization: session ? `Bearer ${session.access_token}` : "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const result: LeadWithRelations = {
          ...data,
          stage: data.stage || undefined,
          contacts: data.contacts || [],
          tasks: data.tasks || [],
          opportunities: data.opportunities || [],
          activities: data.activities || [],
          contactCount: (data.contacts || []).length,
        };
        console.log("[Leads API] getLead via API response:", result.name, "with", result.activities?.length || 0, "activities");
        return result;
      }
      // If API call fails, fall through to Supabase fallback
      console.log("[Leads API] API call failed, falling back to Supabase");
    }
    
    // Fallback: Direct Supabase query (activities limited to current user's RLS scope)
    console.log("[Leads API] getLead via Supabase fallback");
    const workspaceId = await getWorkspaceId();

    // Fetch lead with related data
    const { data: lead, error } = await supabase
      .from("leads")
      .select(`
        *,
        stage:lead_pipeline_stages(id, name, color, position),
        contacts:contacts(*),
        tasks:lead_tasks(*),
        opportunities:lead_opportunities(*)
      `)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) throw error;
    if (!lead) throw new Error("Lead not found");

    // Fetch activities for the lead's contacts
    const contactIds = (lead.contacts || []).map((c: any) => c.id);
    let activities: Activity[] = [];
    if (contactIds.length > 0) {
      const { data: activitiesData } = await supabase
        .from("activities")
        .select(`*, contact:contacts(id, first_name, last_name)`)
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      activities = activitiesData || [];
    }

    const result: LeadWithRelations = {
      ...lead,
      stage: lead.stage || undefined,
      contacts: lead.contacts || [],
      tasks: lead.tasks || [],
      opportunities: lead.opportunities || [],
      activities,
      contactCount: (lead.contacts || []).length,
    };

    console.log("[Leads API] getLead via Supabase response:", result.name, "with", result.activities?.length || 0, "activities");
    return result;
  } catch (error) {
    console.error("[Leads API] getLead ERROR:", error);
    throw error;
  }
}

export async function createLead(data: CreateLeadInput): Promise<Lead> {
  console.log("[Leads API] createLead via Supabase", data);
  try {
    const workspaceId = await getWorkspaceId();
    const userId = await getCurrentUserId();

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        status: data.status || "new",
        notes: data.notes || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postal_code: data.postal_code || null,
        pipeline_id: data.pipeline_id || null,
        stage_id: data.stage_id || null,
      })
      .select(`
        *,
        stage:lead_pipeline_stages(id, name, color, position)
      `)
      .single();

    if (error) throw error;

    const result: Lead = {
      ...lead,
      stage: lead.stage || undefined,
    };

    console.log("[Leads API] createLead response:", result);
    return result;
  } catch (error) {
    console.error("[Leads API] createLead ERROR:", error);
    throw error;
  }
}

export async function updateLead(id: string, data: Omit<UpdateLeadInput, "id">): Promise<Lead> {
  console.log("[Leads API] updateLead via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
    if (data.pipeline_id !== undefined) updateData.pipeline_id = data.pipeline_id;
    if (data.stage_id !== undefined) updateData.stage_id = data.stage_id;

    const { data: lead, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        stage:lead_pipeline_stages(id, name, color, position)
      `)
      .single();

    if (error) throw error;

    const result: Lead = {
      ...lead,
      stage: lead.stage || undefined,
    };

    console.log("[Leads API] updateLead response:", result);
    return result;
  } catch (error) {
    console.error("[Leads API] updateLead ERROR:", error);
    throw error;
  }
}

export async function deleteLead(id: string): Promise<void> {
  console.log("[Leads API] deleteLead via Supabase", id);
  try {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Leads API] deleteLead success");
  } catch (error) {
    console.error("[Leads API] deleteLead ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Move Lead Stage
// ============================================================================

export async function moveLeadStage(data: MoveLeadStageInput): Promise<Lead> {
  console.log("[Leads API] moveLeadStage via Supabase", data);
  try {
    const updateData: Record<string, any> = {
      stage_id: data.stage_id,
      updated_at: new Date().toISOString(),
    };

    if (data.pipeline_id) {
      updateData.pipeline_id = data.pipeline_id;
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", data.lead_id)
      .select(`
        *,
        stage:lead_pipeline_stages(id, name, color, position)
      `)
      .single();

    if (error) throw error;

    const result: Lead = {
      ...lead,
      stage: lead.stage || undefined,
    };

    console.log("[Leads API] moveLeadStage response:", result);
    return result;
  } catch (error) {
    console.error("[Leads API] moveLeadStage ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Lead Tasks
// ============================================================================

export async function getLeadTasks(leadId: string): Promise<LeadTask[]> {
  console.log("[Leads API] getLeadTasks via Supabase", leadId);
  try {
    const { data: tasks, error } = await supabase
      .from("lead_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("[Leads API] getLeadTasks response:", (tasks || []).length, "tasks");
    return tasks || [];
  } catch (error) {
    console.error("[Leads API] getLeadTasks ERROR:", error);
    throw error;
  }
}

export async function createLeadTask(
  leadId: string,
  data: Omit<CreateLeadTaskInput, "lead_id">
): Promise<LeadTask> {
  console.log("[Leads API] createLeadTask via Supabase", leadId, data);
  try {
    const userId = await getCurrentUserId();

    const { data: task, error } = await supabase
      .from("lead_tasks")
      .insert({
        lead_id: leadId,
        user_id: userId,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Leads API] createLeadTask response:", task);
    return task;
  } catch (error) {
    console.error("[Leads API] createLeadTask ERROR:", error);
    throw error;
  }
}

export async function updateLeadTask(
  leadId: string,
  taskId: string,
  data: Omit<UpdateLeadTaskInput, "id">
): Promise<LeadTask> {
  console.log("[Leads API] updateLeadTask via Supabase", leadId, taskId, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.due_date !== undefined) updateData.due_date = data.due_date;
    if (data.is_completed !== undefined) {
      updateData.is_completed = data.is_completed;
      updateData.completed_at = data.is_completed ? new Date().toISOString() : null;
    }

    const { data: task, error } = await supabase
      .from("lead_tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("lead_id", leadId)
      .select()
      .single();

    if (error) throw error;

    console.log("[Leads API] updateLeadTask response:", task);
    return task;
  } catch (error) {
    console.error("[Leads API] updateLeadTask ERROR:", error);
    throw error;
  }
}

export async function deleteLeadTask(leadId: string, taskId: string): Promise<void> {
  console.log("[Leads API] deleteLeadTask via Supabase", leadId, taskId);
  try {
    const { error } = await supabase
      .from("lead_tasks")
      .delete()
      .eq("id", taskId)
      .eq("lead_id", leadId);

    if (error) throw error;

    console.log("[Leads API] deleteLeadTask success");
  } catch (error) {
    console.error("[Leads API] deleteLeadTask ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Lead Opportunities
// ============================================================================

export async function getLeadOpportunities(leadId: string): Promise<LeadOpportunity[]> {
  console.log("[Leads API] getLeadOpportunities via Supabase", leadId);
  try {
    const { data: opportunities, error } = await supabase
      .from("lead_opportunities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("[Leads API] getLeadOpportunities response:", (opportunities || []).length, "opportunities");
    return opportunities || [];
  } catch (error) {
    console.error("[Leads API] getLeadOpportunities ERROR:", error);
    throw error;
  }
}

export async function createLeadOpportunity(
  leadId: string,
  data: Omit<CreateLeadOpportunityInput, "lead_id">
): Promise<LeadOpportunity> {
  console.log("[Leads API] createLeadOpportunity via Supabase", leadId, data);
  try {
    const userId = await getCurrentUserId();

    const { data: opportunity, error } = await supabase
      .from("lead_opportunities")
      .insert({
        lead_id: leadId,
        user_id: userId,
        name: data.name,
        value: data.value || null,
        stage: data.stage || "prospect",
        probability: data.probability ?? 0,
        expected_close_date: data.expected_close_date || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Leads API] createLeadOpportunity response:", opportunity);
    return opportunity;
  } catch (error) {
    console.error("[Leads API] createLeadOpportunity ERROR:", error);
    throw error;
  }
}

export async function updateLeadOpportunity(
  leadId: string,
  opportunityId: string,
  data: Omit<UpdateLeadOpportunityInput, "id">
): Promise<LeadOpportunity> {
  console.log("[Leads API] updateLeadOpportunity via Supabase", leadId, opportunityId, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expected_close_date !== undefined) updateData.expected_close_date = data.expected_close_date;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: opportunity, error } = await supabase
      .from("lead_opportunities")
      .update(updateData)
      .eq("id", opportunityId)
      .eq("lead_id", leadId)
      .select()
      .single();

    if (error) throw error;

    console.log("[Leads API] updateLeadOpportunity response:", opportunity);
    return opportunity;
  } catch (error) {
    console.error("[Leads API] updateLeadOpportunity ERROR:", error);
    throw error;
  }
}

export async function deleteLeadOpportunity(
  leadId: string,
  opportunityId: string
): Promise<void> {
  console.log("[Leads API] deleteLeadOpportunity via Supabase", leadId, opportunityId);
  try {
    const { error } = await supabase
      .from("lead_opportunities")
      .delete()
      .eq("id", opportunityId)
      .eq("lead_id", leadId);

    if (error) throw error;

    console.log("[Leads API] deleteLeadOpportunity success");
  } catch (error) {
    console.error("[Leads API] deleteLeadOpportunity ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Lead Activities
// ============================================================================

export async function getLeadActivities(leadId: string): Promise<Activity[]> {
  console.log("[Leads API] getLeadActivities", leadId);
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // If API_URL is configured, use the web API which bypasses RLS
    // This ensures all lead activities are visible, not just current user's
    if (API_URL) {
      try {
        console.log("[Leads API] getLeadActivities via API");
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${API_URL}/api/leads/${leadId}/activities`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: session ? `Bearer ${session.access_token}` : "",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // API returns { activities: [...] }
          const activities = data.activities || [];
          console.log("[Leads API] getLeadActivities via API response:", activities.length, "activities");
          return activities;
        }
        // If API call fails, fall through to Supabase fallback
        console.warn("[Leads API] API call failed, falling back to Supabase");
      } catch (apiError) {
        console.warn("[Leads API] API call error, falling back to Supabase:", apiError);
      }
    }

    // Fallback: Direct Supabase query (subject to RLS - may show fewer activities)
    console.log("[Leads API] getLeadActivities via Supabase fallback");

    // First get contacts for this lead (activities are linked to contacts)
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id")
      .eq("lead_id", leadId);

    if (contactsError) throw contactsError;

    const contactIds = (contacts || []).map((c: { id: string }) => c.id);
    if (contactIds.length === 0) {
      console.log("[Leads API] getLeadActivities response: 0 activities (no contacts)");
      return [];
    }

    // Fetch activities for these contacts (RLS handles workspace scoping via profile_id)
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select(`
        *,
        contact:contacts(id, first_name, last_name)
      `)
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false });

    if (activitiesError) throw activitiesError;

    console.log("[Leads API] getLeadActivities response:", (activities || []).length, "activities");
    return activities || [];
  } catch (error) {
    console.error("[Leads API] getLeadActivities ERROR:", error);
    throw error;
  }
}

export async function createLeadActivity(
  leadId: string,
  data: {
    type: Activity["type"];
    subject?: string;
    description?: string;
    due_date?: string;
    is_completed?: boolean;
    contact_id?: string;
  }
): Promise<Activity> {
  console.log("[Leads API] createLeadActivity via Supabase", leadId, data);
  try {
    const userId = await getCurrentUserId();

    // Activities require a contact_id (they link to contacts, not leads directly)
    // If no contact_id provided, get the first/primary contact for the lead
    let contactId = data.contact_id;
    if (!contactId) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!contacts || contacts.length === 0) {
        throw new Error("Cannot create activity: lead has no contacts");
      }
      contactId = contacts[0].id;
    }

    const { data: activity, error } = await supabase
      .from("activities")
      .insert({
        profile_id: userId,
        contact_id: contactId,
        type: data.type,
        subject: data.subject || null,
        description: data.description || null,
        due_date: data.due_date || null,
        is_completed: data.is_completed ?? false,
        completed_at: data.is_completed ? new Date().toISOString() : null,
      })
      .select(`
        *,
        contact:contacts(id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    console.log("[Leads API] createLeadActivity response:", activity);
    return activity;
  } catch (error) {
    console.error("[Leads API] createLeadActivity ERROR:", error);
    throw error;
  }
}
