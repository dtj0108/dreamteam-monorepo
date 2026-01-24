"use client"

import { Button } from "@dreamteam/ui/button"
import { PlusIcon, GitBranchIcon, CheckCircleIcon, XCircleIcon } from "lucide-react"
import type { WorkflowAction, ConditionActionConfig } from "@/types/workflow"
import { getOperatorDefinition } from "@/types/workflow"
import { ActionCard } from "./action-card"
import { FlowConnector } from "./flow-connector"

interface ConditionBranchViewProps {
  action: WorkflowAction
  selectedActionId: string | null
  onSelectAction: (actionId: string) => void
  onSelectCondition: () => void
  onAddToBranch: (branch: "if" | "else") => void
  onSelectBranchAction: (actionId: string, branch: "if" | "else") => void
}

export function ConditionBranchView({
  action,
  selectedActionId,
  onSelectAction,
  onSelectCondition,
  onAddToBranch,
  onSelectBranchAction,
}: ConditionBranchViewProps) {
  const condConfig = action.config as unknown as ConditionActionConfig
  const ifBranch = condConfig.if_branch || []
  const elseBranch = condConfig.else_branch || []

  // Get condition summary for display
  const getConditionSummary = () => {
    if (!condConfig.condition?.field_path || !condConfig.condition?.operator) {
      return "Configure condition"
    }
    const operatorDef = getOperatorDefinition(condConfig.condition.operator)
    const fieldName = condConfig.condition.field_path.split(".").pop() || condConfig.condition.field_path
    const operatorLabel = operatorDef?.label.toLowerCase() || condConfig.condition.operator
    if (operatorDef?.requiresValue && condConfig.condition.value) {
      return `${fieldName} ${operatorLabel} "${condConfig.condition.value}"`
    }
    return `${fieldName} ${operatorLabel}`
  }

  const isConfigured = condConfig.condition?.field_path && condConfig.condition?.operator

  return (
    <div className="flex flex-col items-center">
      {/* Condition node */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelectCondition}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelectCondition()
          }
        }}
        className={`
          bg-background border rounded-xl shadow-sm p-4 max-w-md mx-auto cursor-pointer
          transition-all duration-150 outline-none
          focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
          ${selectedActionId === action.id
            ? "border-sky-400 border-2 bg-sky-50/30"
            : "border-border hover:border-sky-300 hover:bg-sky-50/20"
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <GitBranchIcon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">Condition</span>
              <span className="text-sm text-muted-foreground truncate">
                {getConditionSummary()}
              </span>
            </div>
          </div>
          {!isConfigured && (
            <div className="size-6 flex items-center justify-center text-amber-500 shrink-0">
              <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Branch split connector */}
      <div className="relative w-full my-4">
        {/* Center vertical line */}
        <div className="absolute left-1/2 -translate-x-px h-4 w-0.5 bg-border" />
        {/* Horizontal line */}
        <div className="absolute top-4 left-1/4 right-1/4 h-0.5 bg-border" />
        {/* Left vertical down */}
        <div className="absolute left-1/4 top-4 h-4 w-0.5 bg-border" />
        {/* Right vertical down */}
        <div className="absolute right-1/4 -translate-x-px top-4 h-4 w-0.5 bg-border" />
        <div className="h-8" /> {/* Spacer */}
      </div>

      {/* Branches */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {/* If True Branch */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-3">
            <CheckCircleIcon className="size-4" />
            <span>If True</span>
          </div>
          <div className="w-full space-y-2">
            {ifBranch.map((branchAction, index) => (
              <div key={branchAction.id} className="flex flex-col items-center">
                <ActionCard
                  action={branchAction}
                  selected={selectedActionId === branchAction.id}
                  onClick={() => onSelectBranchAction(branchAction.id, "if")}
                />
                {index < ifBranch.length - 1 && (
                  <div className="h-4 w-0.5 bg-border my-1" />
                )}
              </div>
            ))}
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                onClick={() => onAddToBranch("if")}
              >
                <PlusIcon className="size-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Else Branch */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-sm font-medium text-orange-600 mb-3">
            <XCircleIcon className="size-4" />
            <span>Else</span>
          </div>
          <div className="w-full space-y-2">
            {elseBranch.map((branchAction, index) => (
              <div key={branchAction.id} className="flex flex-col items-center">
                <ActionCard
                  action={branchAction}
                  selected={selectedActionId === branchAction.id}
                  onClick={() => onSelectBranchAction(branchAction.id, "else")}
                />
                {index < elseBranch.length - 1 && (
                  <div className="h-4 w-0.5 bg-border my-1" />
                )}
              </div>
            ))}
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                onClick={() => onAddToBranch("else")}
              >
                <PlusIcon className="size-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Branch merge connector */}
      <div className="relative w-full my-4">
        {/* Left vertical up */}
        <div className="absolute left-1/4 h-4 w-0.5 bg-border" />
        {/* Right vertical up */}
        <div className="absolute right-1/4 -translate-x-px h-4 w-0.5 bg-border" />
        {/* Horizontal line */}
        <div className="absolute top-4 left-1/4 right-1/4 h-0.5 bg-border" />
        {/* Center vertical down */}
        <div className="absolute left-1/2 -translate-x-px top-4 h-4 w-0.5 bg-border" />
        <div className="h-8" /> {/* Spacer */}
      </div>
    </div>
  )
}
