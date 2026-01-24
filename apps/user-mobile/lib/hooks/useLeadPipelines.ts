import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getLeadPipelines,
  getLeadPipeline,
  createLeadPipeline,
  updateLeadPipeline,
  deleteLeadPipeline,
  addLeadPipelineStage,
  updateLeadPipelineStages,
  deleteLeadPipelineStage,
  CreateLeadPipelineInput,
  UpdateLeadPipelineInput,
  CreateLeadPipelineStageInput,
  UpdateLeadPipelineStagesInput,
} from "../api/lead-pipelines";
import { LeadPipeline, LeadPipelinesResponse, LeadPipelineStage } from "../types/sales";

// Query keys
export const leadPipelineKeys = {
  all: ["lead-pipelines"] as const,
  lists: () => [...leadPipelineKeys.all, "list"] as const,
  list: () => [...leadPipelineKeys.lists()] as const,
  details: () => [...leadPipelineKeys.all, "detail"] as const,
  detail: (id: string) => [...leadPipelineKeys.details(), id] as const,
};

// Pipeline queries
export function useLeadPipelines() {
  return useQuery<LeadPipelinesResponse>({
    queryKey: leadPipelineKeys.list(),
    queryFn: getLeadPipelines,
  });
}

export function useLeadPipeline(id: string) {
  return useQuery<LeadPipeline>({
    queryKey: leadPipelineKeys.detail(id),
    queryFn: () => getLeadPipeline(id),
    enabled: !!id,
  });
}

// Pipeline mutations
export function useCreateLeadPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadPipelineInput) => createLeadPipeline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
    },
  });
}

export function useUpdateLeadPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadPipelineInput }) =>
      updateLeadPipeline(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.detail(id) });
    },
  });
}

export function useDeleteLeadPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLeadPipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
    },
  });
}

// Stage mutations
export function useAddLeadPipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pipelineId,
      data,
    }: {
      pipelineId: string;
      data: CreateLeadPipelineStageInput;
    }) => addLeadPipelineStage(pipelineId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.detail(pipelineId) });
    },
  });
}

export function useUpdateLeadPipelineStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pipelineId,
      data,
    }: {
      pipelineId: string;
      data: UpdateLeadPipelineStagesInput;
    }) => updateLeadPipelineStages(pipelineId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.detail(pipelineId) });
    },
  });
}

export function useDeleteLeadPipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      deleteLeadPipelineStage(pipelineId, stageId),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadPipelineKeys.detail(pipelineId) });
    },
  });
}

// Helper hook to get default pipeline
export function useDefaultLeadPipeline() {
  const { data, ...rest } = useLeadPipelines();
  const defaultPipeline = data?.pipelines?.find((p) => p.is_default) || data?.pipelines?.[0];
  return { data: defaultPipeline, ...rest };
}
