import { supabase } from "../supabase";
import {
  LeadPipeline,
  LeadPipelineStage,
  LeadPipelinesResponse,
} from "../types/sales";

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

// ============================================================================
// Pipelines CRUD
// ============================================================================

export async function getLeadPipelines(): Promise<LeadPipelinesResponse> {
  console.log("[LeadPipelines API] getLeadPipelines via Supabase");
  try {
    const userId = await getCurrentUserId();

    const { data: pipelines, error } = await supabase
      .from("lead_pipelines")
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Sort stages by position within each pipeline
    const transformedPipelines = (pipelines || []).map((pipeline: any) => ({
      ...pipeline,
      stages: (pipeline.stages || []).sort((a: LeadPipelineStage, b: LeadPipelineStage) =>
        a.position - b.position
      ),
    })) as LeadPipeline[];

    console.log("[LeadPipelines API] getLeadPipelines response:", transformedPipelines.length, "pipelines");
    return { pipelines: transformedPipelines };
  } catch (error) {
    console.error("[LeadPipelines API] getLeadPipelines ERROR:", error);
    throw error;
  }
}

export async function getLeadPipeline(id: string): Promise<LeadPipeline> {
  console.log("[LeadPipelines API] getLeadPipeline via Supabase", id);
  try {
    const { data: pipeline, error } = await supabase
      .from("lead_pipelines")
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    // Sort stages by position
    const result: LeadPipeline = {
      ...pipeline,
      stages: (pipeline.stages || []).sort((a: LeadPipelineStage, b: LeadPipelineStage) =>
        a.position - b.position
      ),
    };

    console.log("[LeadPipelines API] getLeadPipeline response:", result.name);
    return result;
  } catch (error) {
    console.error("[LeadPipelines API] getLeadPipeline ERROR:", error);
    throw error;
  }
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
  console.log("[LeadPipelines API] createLeadPipeline via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    // If this pipeline is default, unset other defaults first
    if (data.is_default) {
      await supabase
        .from("lead_pipelines")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);
    }

    // Create the pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        is_default: data.is_default ?? false,
      })
      .select()
      .single();

    if (pipelineError) throw pipelineError;

    // Create stages if provided
    let stages: LeadPipelineStage[] = [];
    if (data.stages && data.stages.length > 0) {
      const stageInserts = data.stages.map((stage, index) => ({
        pipeline_id: pipeline.id,
        name: stage.name,
        color: stage.color,
        position: index,
        is_won: stage.is_won ?? false,
        is_lost: stage.is_lost ?? false,
      }));

      const { data: createdStages, error: stagesError } = await supabase
        .from("lead_pipeline_stages")
        .insert(stageInserts)
        .select();

      if (stagesError) {
        console.error("[LeadPipelines API] Failed to create stages:", stagesError);
      } else {
        stages = createdStages || [];
      }
    }

    const result: LeadPipeline = {
      ...pipeline,
      stages,
    };

    console.log("[LeadPipelines API] createLeadPipeline response:", result);
    return result;
  } catch (error) {
    console.error("[LeadPipelines API] createLeadPipeline ERROR:", error);
    throw error;
  }
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
  console.log("[LeadPipelines API] updateLeadPipeline via Supabase", id, data);
  try {
    const userId = await getCurrentUserId();

    // If setting this pipeline as default, unset other defaults first
    if (data.is_default) {
      await supabase
        .from("lead_pipelines")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)
        .neq("id", id);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_default !== undefined) updateData.is_default = data.is_default;

    const { data: pipeline, error } = await supabase
      .from("lead_pipelines")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        stages:lead_pipeline_stages(*)
      `)
      .single();

    if (error) throw error;

    const result: LeadPipeline = {
      ...pipeline,
      stages: (pipeline.stages || []).sort((a: LeadPipelineStage, b: LeadPipelineStage) =>
        a.position - b.position
      ),
    };

    console.log("[LeadPipelines API] updateLeadPipeline response:", result);
    return result;
  } catch (error) {
    console.error("[LeadPipelines API] updateLeadPipeline ERROR:", error);
    throw error;
  }
}

export async function deleteLeadPipeline(id: string): Promise<void> {
  console.log("[LeadPipelines API] deleteLeadPipeline via Supabase", id);
  try {
    // Delete stages first (cascade may handle this, but being explicit)
    await supabase
      .from("lead_pipeline_stages")
      .delete()
      .eq("pipeline_id", id);

    // Delete the pipeline
    const { error } = await supabase
      .from("lead_pipelines")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[LeadPipelines API] deleteLeadPipeline success");
  } catch (error) {
    console.error("[LeadPipelines API] deleteLeadPipeline ERROR:", error);
    throw error;
  }
}

// ============================================================================
// Pipeline Stages
// ============================================================================

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
  console.log("[LeadPipelines API] addLeadPipelineStage via Supabase", pipelineId, data);
  try {
    // Get the max position for this pipeline
    const { data: existingStages, error: posError } = await supabase
      .from("lead_pipeline_stages")
      .select("position")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: false })
      .limit(1);

    if (posError) throw posError;

    const nextPosition = existingStages && existingStages.length > 0
      ? existingStages[0].position + 1
      : 0;

    const { data: stage, error } = await supabase
      .from("lead_pipeline_stages")
      .insert({
        pipeline_id: pipelineId,
        name: data.name,
        color: data.color,
        position: nextPosition,
        is_won: data.is_won ?? false,
        is_lost: data.is_lost ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[LeadPipelines API] addLeadPipelineStage response:", stage);
    return stage;
  } catch (error) {
    console.error("[LeadPipelines API] addLeadPipelineStage ERROR:", error);
    throw error;
  }
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
  console.log("[LeadPipelines API] updateLeadPipelineStages via Supabase", pipelineId, data);
  try {
    // Update each stage individually
    const updatePromises = data.stages.map(async (stageUpdate) => {
      const updateData: Record<string, any> = {};

      if (stageUpdate.name !== undefined) updateData.name = stageUpdate.name;
      if (stageUpdate.color !== undefined) updateData.color = stageUpdate.color;
      if (stageUpdate.position !== undefined) updateData.position = stageUpdate.position;
      if (stageUpdate.is_won !== undefined) updateData.is_won = stageUpdate.is_won;
      if (stageUpdate.is_lost !== undefined) updateData.is_lost = stageUpdate.is_lost;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("lead_pipeline_stages")
          .update(updateData)
          .eq("id", stageUpdate.id)
          .eq("pipeline_id", pipelineId);

        if (error) throw error;
      }
    });

    await Promise.all(updatePromises);

    // Fetch updated stages
    const { data: stages, error } = await supabase
      .from("lead_pipeline_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true });

    if (error) throw error;

    console.log("[LeadPipelines API] updateLeadPipelineStages response:", (stages || []).length, "stages");
    return stages || [];
  } catch (error) {
    console.error("[LeadPipelines API] updateLeadPipelineStages ERROR:", error);
    throw error;
  }
}

export async function deleteLeadPipelineStage(
  pipelineId: string,
  stageId: string
): Promise<void> {
  console.log("[LeadPipelines API] deleteLeadPipelineStage via Supabase", pipelineId, stageId);
  try {
    const { error } = await supabase
      .from("lead_pipeline_stages")
      .delete()
      .eq("id", stageId)
      .eq("pipeline_id", pipelineId);

    if (error) throw error;

    console.log("[LeadPipelines API] deleteLeadPipelineStage success");
  } catch (error) {
    console.error("[LeadPipelines API] deleteLeadPipelineStage ERROR:", error);
    throw error;
  }
}
