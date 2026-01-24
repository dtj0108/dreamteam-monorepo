import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  moveLeadStage,
  getLeadTasks,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
  getLeadOpportunities,
  createLeadOpportunity,
  updateLeadOpportunity,
  deleteLeadOpportunity,
  getLeadActivities,
  createLeadActivity,
  LeadsQueryParams,
} from "../api/leads";
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

// Query keys
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params?: LeadsQueryParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  tasks: (leadId: string) => [...leadKeys.detail(leadId), "tasks"] as const,
  opportunities: (leadId: string) => [...leadKeys.detail(leadId), "opportunities"] as const,
  activities: (leadId: string) => [...leadKeys.detail(leadId), "activities"] as const,
};

// Leads queries
export function useLeads(params?: LeadsQueryParams) {
  return useQuery<LeadsResponse>({
    queryKey: leadKeys.list(params),
    queryFn: () => getLeads(params),
  });
}

export function useLead(id: string) {
  return useQuery<LeadWithRelations>({
    queryKey: leadKeys.detail(id),
    queryFn: () => getLead(id),
    enabled: !!id,
  });
}

// Lead mutations
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadInput) => createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<UpdateLeadInput, "id"> }) =>
      updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useMoveLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MoveLeadStageInput) => moveLeadStage(data),
    onSuccess: (_, { lead_id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead_id) });
    },
  });
}

// Lead Tasks
export function useLeadTasks(leadId: string) {
  return useQuery<LeadTask[]>({
    queryKey: leadKeys.tasks(leadId),
    queryFn: () => getLeadTasks(leadId),
    enabled: !!leadId,
  });
}

export function useCreateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: Omit<CreateLeadTaskInput, "lead_id"> }) =>
      createLeadTask(leadId, data),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.tasks(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

export function useUpdateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      taskId,
      data,
    }: {
      leadId: string;
      taskId: string;
      data: Omit<UpdateLeadTaskInput, "id">;
    }) => updateLeadTask(leadId, taskId, data),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.tasks(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

export function useDeleteLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, taskId }: { leadId: string; taskId: string }) =>
      deleteLeadTask(leadId, taskId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.tasks(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

// Lead Opportunities
export function useLeadOpportunities(leadId: string) {
  return useQuery<LeadOpportunity[]>({
    queryKey: leadKeys.opportunities(leadId),
    queryFn: () => getLeadOpportunities(leadId),
    enabled: !!leadId,
  });
}

export function useCreateLeadOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      data,
    }: {
      leadId: string;
      data: Omit<CreateLeadOpportunityInput, "lead_id">;
    }) => createLeadOpportunity(leadId, data),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.opportunities(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

export function useUpdateLeadOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      opportunityId,
      data,
    }: {
      leadId: string;
      opportunityId: string;
      data: Omit<UpdateLeadOpportunityInput, "id">;
    }) => updateLeadOpportunity(leadId, opportunityId, data),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.opportunities(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

export function useDeleteLeadOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, opportunityId }: { leadId: string; opportunityId: string }) =>
      deleteLeadOpportunity(leadId, opportunityId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.opportunities(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

// Lead Activities
export function useLeadActivities(leadId: string) {
  return useQuery<Activity[]>({
    queryKey: leadKeys.activities(leadId),
    queryFn: () => getLeadActivities(leadId),
    enabled: !!leadId,
  });
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      data,
    }: {
      leadId: string;
      data: {
        type: Activity["type"];
        subject?: string;
        description?: string;
        due_date?: string;
        is_completed?: boolean;
      };
    }) => createLeadActivity(leadId, data),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}
