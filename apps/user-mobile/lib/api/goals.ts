import { del, get, patch, post } from "../api";
import { Goal, GoalType } from "../types/finance";

// Response Types
export interface GoalsResponse {
  goals: Goal[];
  summary: {
    activeCount: number;
    onTrackCount: number;
    revenueProgress: number;
    profitProgress: number;
  };
}

// Filter Types
export interface GoalFilters {
  type?: GoalType;
  is_achieved?: boolean;
}

// Input Types
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

// Helper function
function buildQueryString(filters: GoalFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.is_achieved !== undefined) {
    params.append("is_achieved", String(filters.is_achieved));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

// API Functions
export async function getGoals(
  filters: GoalFilters = {}
): Promise<GoalsResponse> {
  const query = buildQueryString(filters);
  return get<GoalsResponse>(`/api/goals${query}`);
}

export async function getGoal(id: string): Promise<Goal> {
  return get<Goal>(`/api/goals/${id}`);
}

export async function createGoal(data: CreateGoalInput): Promise<Goal> {
  return post<Goal>("/api/goals", data);
}

export async function updateGoal(
  id: string,
  data: UpdateGoalInput
): Promise<Goal> {
  return patch<Goal>(`/api/goals/${id}`, data);
}

export async function deleteGoal(id: string): Promise<void> {
  return del(`/api/goals/${id}`);
}
