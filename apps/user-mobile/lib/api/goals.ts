import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../supabase";
import { Goal, GoalType, getGoalProgress, isGoalOnTrack } from "../types/finance";

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
// Types
// ============================================================================

export interface GoalsResponse {
  goals: Goal[];
  summary: {
    activeCount: number;
    onTrackCount: number;
    revenueProgress: number;
    profitProgress: number;
  };
}

export interface GoalFilters {
  type?: GoalType;
  is_achieved?: boolean;
}

export interface CreateGoalInput {
  type: GoalType;
  name: string;
  target_amount: number;
  current_amount?: number;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateGoalInput {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_achieved?: boolean;
}

// ============================================================================
// Goals CRUD
// ============================================================================

export async function getGoals(
  filters: GoalFilters = {}
): Promise<GoalsResponse> {
  console.log("[Goals API] getGoals via Supabase", filters);
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("goals")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });

    if (filters.type) {
      query = query.eq("type", filters.type);
    }
    if (filters.is_achieved !== undefined) {
      query = query.eq("is_achieved", filters.is_achieved);
    }

    const { data: goals, error } = await query;

    if (error) throw error;

    // Calculate summary
    const activeGoals = (goals || []).filter((g: Goal) => !g.is_achieved);
    const onTrackGoals = activeGoals.filter((g: Goal) => isGoalOnTrack(g));

    // Find revenue and profit goals for progress
    const revenueGoal = activeGoals.find((g: Goal) => g.type === "revenue");
    const profitGoal = activeGoals.find((g: Goal) => g.type === "profit");

    const summary = {
      activeCount: activeGoals.length,
      onTrackCount: onTrackGoals.length,
      revenueProgress: revenueGoal ? getGoalProgress(revenueGoal) : 0,
      profitProgress: profitGoal ? getGoalProgress(profitGoal) : 0,
    };

    console.log("[Goals API] getGoals response:", (goals || []).length, "goals");
    return { goals: goals || [], summary };
  } catch (error) {
    console.error("[Goals API] getGoals ERROR:", error);
    throw error;
  }
}

export async function getGoal(id: string): Promise<Goal> {
  console.log("[Goals API] getGoal via Supabase", id);
  try {
    const { data: goal, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("[Goals API] getGoal response:", goal.name);
    return goal;
  } catch (error) {
    console.error("[Goals API] getGoal ERROR:", error);
    throw error;
  }
}

export async function createGoal(data: CreateGoalInput): Promise<Goal> {
  console.log("[Goals API] createGoal via Supabase", data);
  try {
    const userId = await getCurrentUserId();

    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        profile_id: userId,
        type: data.type,
        name: data.name,
        target_amount: data.target_amount,
        current_amount: data.current_amount ?? 0,
        start_date: data.start_date,
        end_date: data.end_date || null,
        notes: data.notes || null,
        is_achieved: false,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[Goals API] createGoal response:", goal);
    return goal;
  } catch (error) {
    console.error("[Goals API] createGoal ERROR:", error);
    throw error;
  }
}

export async function updateGoal(
  id: string,
  data: UpdateGoalInput
): Promise<Goal> {
  console.log("[Goals API] updateGoal via Supabase", id, data);
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.target_amount !== undefined) updateData.target_amount = data.target_amount;
    if (data.current_amount !== undefined) updateData.current_amount = data.current_amount;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.end_date !== undefined) updateData.end_date = data.end_date;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.is_achieved !== undefined) updateData.is_achieved = data.is_achieved;

    const { data: goal, error } = await supabase
      .from("goals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[Goals API] updateGoal response:", goal);
    return goal;
  } catch (error) {
    console.error("[Goals API] updateGoal ERROR:", error);
    throw error;
  }
}

export async function deleteGoal(id: string): Promise<void> {
  console.log("[Goals API] deleteGoal via Supabase", id);
  try {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[Goals API] deleteGoal success");
  } catch (error) {
    console.error("[Goals API] deleteGoal ERROR:", error);
    throw error;
  }
}
