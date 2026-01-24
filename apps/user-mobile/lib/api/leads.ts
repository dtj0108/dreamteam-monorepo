import { del, get, post, put } from "../api";
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

// Leads CRUD
export async function getLeads(params?: LeadsQueryParams): Promise<LeadsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append("status", params.status);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.pipeline_id) searchParams.append("pipeline_id", params.pipeline_id);
  if (params?.stage_id) searchParams.append("stage_id", params.stage_id);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const query = searchParams.toString();
  const url = query ? `/api/leads?${query}` : "/api/leads";
  const response = await get<Lead[] | LeadsResponse>(url);

  // Handle both array and object responses
  if (Array.isArray(response)) {
    return { leads: response, total: response.length };
  }
  return response;
}

export async function getLead(id: string): Promise<LeadWithRelations> {
  return get<LeadWithRelations>(`/api/leads/${id}`);
}

export async function createLead(data: CreateLeadInput): Promise<Lead> {
  return post<Lead>("/api/leads", data);
}

export async function updateLead(id: string, data: Omit<UpdateLeadInput, "id">): Promise<Lead> {
  return put<Lead>(`/api/leads/${id}`, data);
}

export async function deleteLead(id: string): Promise<void> {
  return del(`/api/leads/${id}`);
}

// Move lead to different stage
export async function moveLeadStage(data: MoveLeadStageInput): Promise<Lead> {
  return put<Lead>(`/api/leads/${data.lead_id}/stage`, {
    stage_id: data.stage_id,
    pipeline_id: data.pipeline_id,
  });
}

// Lead Tasks
export async function getLeadTasks(leadId: string): Promise<LeadTask[]> {
  return get<LeadTask[]>(`/api/leads/${leadId}/tasks`);
}

export async function createLeadTask(
  leadId: string,
  data: Omit<CreateLeadTaskInput, "lead_id">
): Promise<LeadTask> {
  return post<LeadTask>(`/api/leads/${leadId}/tasks`, data);
}

export async function updateLeadTask(
  leadId: string,
  taskId: string,
  data: Omit<UpdateLeadTaskInput, "id">
): Promise<LeadTask> {
  return put<LeadTask>(`/api/leads/${leadId}/tasks/${taskId}`, data);
}

export async function deleteLeadTask(leadId: string, taskId: string): Promise<void> {
  return del(`/api/leads/${leadId}/tasks/${taskId}`);
}

// Lead Opportunities
export async function getLeadOpportunities(leadId: string): Promise<LeadOpportunity[]> {
  return get<LeadOpportunity[]>(`/api/leads/${leadId}/opportunities`);
}

export async function createLeadOpportunity(
  leadId: string,
  data: Omit<CreateLeadOpportunityInput, "lead_id">
): Promise<LeadOpportunity> {
  return post<LeadOpportunity>(`/api/leads/${leadId}/opportunities`, data);
}

export async function updateLeadOpportunity(
  leadId: string,
  opportunityId: string,
  data: Omit<UpdateLeadOpportunityInput, "id">
): Promise<LeadOpportunity> {
  return put<LeadOpportunity>(`/api/leads/${leadId}/opportunities/${opportunityId}`, data);
}

export async function deleteLeadOpportunity(
  leadId: string,
  opportunityId: string
): Promise<void> {
  return del(`/api/leads/${leadId}/opportunities/${opportunityId}`);
}

// Lead Activities
export async function getLeadActivities(leadId: string): Promise<Activity[]> {
  return get<Activity[]>(`/api/leads/${leadId}/activities`);
}

export async function createLeadActivity(
  leadId: string,
  data: {
    type: Activity["type"];
    subject?: string;
    description?: string;
    due_date?: string;
    is_completed?: boolean;
  }
): Promise<Activity> {
  return post<Activity>(`/api/leads/${leadId}/activities`, data);
}
