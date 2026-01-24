import { z } from "zod"
import { tool } from "ai"
import type { ToolContext, GoalsResult } from "../types"

export const goalsSchema = z.object({
  action: z.enum(["query", "create", "updateProgress"]).default("query").describe("Action to perform: query goals, create a new goal, or update goal progress"),
  // Query params
  status: z.enum(["all", "active", "completed"]).optional().default("active").describe("Filter by goal status (for query)"),
  // Create params
  name: z.string().optional().describe("Goal name (required for create)"),
  targetAmount: z.number().optional().describe("Target amount to save (required for create)"),
  deadline: z.string().optional().describe("Goal deadline in ISO format (for create)"),
  // Update params
  goalId: z.string().optional().describe("Goal ID to update (required for updateProgress)"),
  currentAmount: z.number().optional().describe("New current amount saved (required for updateProgress)"),
})

export function createGoalsTool(context: ToolContext) {
  return tool({
    description: "Manage financial goals. Query goals, create new savings targets, or update progress toward goals.",
    inputSchema: goalsSchema,
    execute: async (params: z.infer<typeof goalsSchema>): Promise<GoalsResult | { success: boolean; message: string; goal?: any }> => {
      const { supabase, userId } = context
      const { action } = params

      // CREATE: Add a new goal
      if (action === "create") {
        const { name, targetAmount, deadline } = params

        if (!name) {
          throw new Error("Name is required to create a goal")
        }
        if (targetAmount === undefined) {
          throw new Error("Target amount is required to create a goal")
        }

        const { data: goal, error } = await supabase
          .from("goals")
          .insert({
            user_id: userId,
            name,
            target_amount: targetAmount,
            current_amount: 0,
            end_date: deadline || null,
            is_achieved: false,
          })
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to create goal: ${error.message}`)
        }

        return {
          success: true,
          message: `Goal "${name}" created with target of $${targetAmount.toLocaleString()}`,
          goal,
        }
      }

      // UPDATE PROGRESS: Update current amount saved
      if (action === "updateProgress") {
        const { goalId, currentAmount } = params

        if (!goalId) {
          throw new Error("Goal ID is required to update progress")
        }
        if (currentAmount === undefined) {
          throw new Error("Current amount is required")
        }

        // First get the goal to check target
        const { data: existingGoal } = await supabase
          .from("goals")
          .select("target_amount")
          .eq("id", goalId)
          .eq("user_id", userId)
          .single()

        const isAchieved = existingGoal && currentAmount >= existingGoal.target_amount

        const { data: goal, error } = await supabase
          .from("goals")
          .update({
            current_amount: currentAmount,
            is_achieved: isAchieved,
          })
          .eq("id", goalId)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(`Failed to update goal progress: ${error.message}`)
        }

        const message = isAchieved
          ? `Goal achieved! Updated to $${currentAmount.toLocaleString()}`
          : `Goal progress updated to $${currentAmount.toLocaleString()}`

        return {
          success: true,
          message,
          goal,
        }
      }

      // QUERY: Get goals (default)
      const { status = "active" } = params

      let query = supabase
        .from("goals")
        .select("id, name, target_amount, current_amount, end_date, is_achieved")
        .eq("user_id", userId)
        .order("end_date", { ascending: true })

      if (status === "active") {
        query = query.eq("is_achieved", false)
      } else if (status === "completed") {
        query = query.eq("is_achieved", true)
      }

      const { data: goals, error } = await query

      if (error) {
        throw new Error(`Failed to fetch goals: ${error.message}`)
      }

      let activeCount = 0
      let completedCount = 0
      let totalTargeted = 0
      let totalSaved = 0

      const formattedGoals = (goals || []).map((goal: any) => {
        const progress =
          goal.target_amount > 0
            ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
            : 0

        if (goal.is_achieved) {
          completedCount++
        } else {
          activeCount++
        }

        totalTargeted += goal.target_amount
        totalSaved += goal.current_amount

        return {
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          progress: Math.round(progress * 10) / 10,
          deadline: goal.end_date,
          isAchieved: goal.is_achieved,
        }
      })

      return {
        goals: formattedGoals,
        summary: {
          activeCount,
          completedCount,
          totalTargeted,
          totalSaved,
        },
      }
    },
  })
}
