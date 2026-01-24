"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PiggyBank,
  Handshake,
  TrendingUp,
  FileSearch,
  Plus,
  Loader2,
  Sparkles
} from "lucide-react"
import { useTeam } from "@/providers/team-provider"
import type { LucideIcon } from "lucide-react"

interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: LucideIcon
  tools: string[]
  systemPrompt: string
}

const agentTemplates: AgentTemplate[] = [
  {
    id: "budget-coach",
    name: "Budget Coach",
    description: "Helps users understand spending and create budgets",
    icon: PiggyBank,
    tools: ["budgets", "transactions"],
    systemPrompt: `You are a friendly budget coach. Help users understand their spending patterns, create realistic budgets, and stay accountable. When users overspend, be encouraging not judgmental. Always suggest specific, actionable steps.

When analyzing spending:
- Look for patterns and trends
- Compare to budget limits
- Suggest categories that could be reduced
- Celebrate wins and progress

Be conversational and supportive. Use the tools available to get real data before making recommendations.`,
  },
  {
    id: "sales-agent",
    name: "Sales Agent",
    description: "Manages leads, tracks pipeline, handles follow-ups",
    icon: Handshake,
    tools: ["leads", "opportunities", "tasks"],
    systemPrompt: `You are a proactive sales assistant. Help users manage their leads, track opportunities through the pipeline, and never miss follow-ups.

Your priorities:
- Surface overdue tasks and urgent follow-ups
- Track opportunity values and close probabilities
- Suggest next actions for each lead
- Keep responses concise and action-oriented

When asked about pipeline, calculate weighted values and highlight deals that need attention.`,
  },
  {
    id: "investment-advisor",
    name: "Investment Advisor",
    description: "Tracks goals and analyzes account balances",
    icon: TrendingUp,
    tools: ["accounts", "goals"],
    systemPrompt: `You are a knowledgeable investment advisor. Help users set financial goals, track progress, and understand their account balances.

Guidelines:
- Provide balanced advice about saving vs spending
- Track goal progress and celebrate milestones
- Analyze account balances and net worth
- Never give specific stock picks or investment advice
- Focus on goal-based planning

Be informative but cautious. Always remind users to consult a financial professional for major decisions.`,
  },
  {
    id: "expense-auditor",
    name: "Expense Auditor",
    description: "Finds unusual spending and creates reports",
    icon: FileSearch,
    tools: ["transactions", "dataExport"],
    systemPrompt: `You are a meticulous expense auditor. Your job is to find unusual spending, identify potential savings, and help users categorize transactions correctly.

When auditing:
- Flag transactions that seem unusual or duplicated
- Identify subscription services that may be forgotten
- Find opportunities to reduce recurring expenses
- Create detailed reports when asked
- Be thorough and detail-oriented

Export data when users need documentation or records.`,
  },
]

export function AgentTemplates() {
  const { createAgent } = useTeam()
  const [creatingId, setCreatingId] = useState<string | null>(null)

  const handleCreateFromTemplate = async (template: AgentTemplate) => {
    try {
      setCreatingId(template.id)
      await createAgent({
        name: template.name,
        description: template.description,
        systemPrompt: template.systemPrompt,
        tools: template.tools,
      })
    } catch (error) {
      console.error("Failed to create agent:", error)
    } finally {
      setCreatingId(null)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="size-16 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="size-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Choose an AI Agent</h2>
        <p className="text-muted-foreground">
          Select a pre-built agent to get started, or create a custom one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {agentTemplates.map((template) => {
          const Icon = template.icon
          const isCreating = creatingId === template.id

          return (
            <Card
              key={template.id}
              className="relative overflow-hidden hover:border-orange-500/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center shrink-0">
                    <Icon className="size-6 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.tools.map((tool) => (
                        <span
                          key={tool}
                          className="text-xs bg-muted px-2 py-0.5 rounded-full"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                    <Button
                      onClick={() => handleCreateFromTemplate(template)}
                      disabled={creatingId !== null}
                      size="sm"
                      className="w-full"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4 mr-2" />
                          Create {template.name}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
