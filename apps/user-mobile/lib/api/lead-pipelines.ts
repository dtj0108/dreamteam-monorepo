import { del, get, post, put } from "../api";
import {
  LeadPipeline,
  LeadPipelineStage,
  LeadPipelinesResponse,
} from "../types/sales";

// Pipelines
export async function getLeadPipelines(): Promise<LeadPipelinesResponse> {
  return get<LeadPipelinesResponse>("/api/lead-pipelines");
}

export async function getLeadPipeline(id: string): Promise<LeadPipeline> {
  return get<LeadPipeline>(`/api/lead-pipelines/${id}`);
}

export interface CreateLeadPipelineInput {
  name: string;
  description?: string;
  is_default?: boolean;
  stages?: {
    name: string;
    color: string;
    is_won?: boolean;
    is_lost?: boolean;
  }[];
}

export async function createLeadPipeline(data: CreateLeadPipelineInput): Promise<LeadPipeline> {
  return post<LeadPipeline>("/api/lead-pipelines", data);
}

export interface UpdateLeadPipelineInput {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export async function updateLeadPipeline(
  id: string,
  data: UpdateLeadPipelineInput
): Promise<LeadPipeline> {
  return put<LeadPipeline>(`/api/lead-pipelines/${id}`, data);
}

export async function deleteLeadPipeline(id: string): Promise<void> {
  return del(`/api/lead-pipelines/${id}`);
}

// Pipeline Stages
export interface CreateLeadPipelineStageInput {
  name: string;
  color: string;
  is_won?: boolean;
  is_lost?: boolean;
}

export async function addLeadPipelineStage(
  pipelineId: string,
  data: CreateLeadPipelineStageInput
): Promise<LeadPipelineStage> {
  return post<LeadPipelineStage>(`/api/lead-pipelines/${pipelineId}/stages`, data);
}

export interface UpdateLeadPipelineStagesInput {
  stages: {
    id: string;
    name?: string;
    color?: string;
    position?: number;
    is_won?: boolean;
    is_lost?: boolean;
  }[];
}

export async function updateLeadPipelineStages(
  pipelineId: string,
  data: UpdateLeadPipelineStagesInput
): Promise<LeadPipelineStage[]> {
  return put<LeadPipelineStage[]>(`/api/lead-pipelines/${pipelineId}/stages`, data);
}

export async function deleteLeadPipelineStage(
  pipelineId: string,
  stageId: string
): Promise<void> {
  return del(`/api/lead-pipelines/${pipelineId}/stages?stageId=${stageId}`);
}
