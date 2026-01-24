"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Sparkles, Receipt, PieChart, Wallet, Target, Search, Download, Users, TrendingUp, CheckSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const toolOptions = [
  {
    id: "transactions",
    name: "Transactions",
    description: "Query and analyze transaction history",
    icon: Receipt,
  },
  {
    id: "budgets",
    name: "Budgets",
    description: "Check budget status and spending",
    icon: PieChart,
  },
  {
    id: "accounts",
    name: "Accounts",
    description: "Access account balances",
    icon: Wallet,
  },
  {
    id: "goals",
    name: "Goals",
    description: "Track financial goal progress",
    icon: Target,
  },
  {
    id: "webSearch",
    name: "Web Search",
    description: "Search for financial news and info",
    icon: Search,
  },
  {
    id: "dataExport",
    name: "Data Export",
    description: "Export data as CSV or JSON files",
    icon: Download,
  },
  // CRM Tools
  {
    id: "leads",
    name: "Leads",
    description: "Access and manage sales leads",
    icon: Users,
  },
  {
    id: "opportunities",
    name: "Opportunities",
    description: "View sales pipeline and deals",
    icon: TrendingUp,
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Track follow-up tasks and reminders",
    icon: CheckSquare,
  },
]

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  onCreateAgent: (agent: {
    name: string
    description: string
    systemPrompt: string
    tools: string[]
  }) => Promise<void>
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreateAgent,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("")
      setDescription("")
      setSystemPrompt("")
      setSelectedTools([])
      setError(null)
      setIsLoading(false)
    }
  }, [open])

  const handleToggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId)
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError("Agent name is required")
      return
    }
    if (!systemPrompt.trim()) {
      setError("System prompt is required")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      await onCreateAgent({
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        tools: selectedTools,
      })
      
      // Close dialog (form reset happens in useEffect)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-orange-500" />
            Create AI Agent
          </DialogTitle>
          <DialogDescription>
            Create a custom AI agent for your team. Define its personality, instructions, and what data it can access.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                  placeholder="e.g. Budget Buddy, Finance Advisor"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of what this agent does"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Instructions (System Prompt)</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value)
                  setError(null)
                }}
                placeholder="Define how the agent should behave, its personality, and what it should help with. For example:

You are a friendly budget advisor. Help users understand their spending patterns and suggest ways to save money. Be encouraging but also honest about areas where they could improve."
                rows={6}
                disabled={isLoading}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These instructions define how the agent will respond and what it focuses on.
              </p>
            </div>

            {/* Tool Access */}
            <div className="space-y-3">
              <Label>Data Access (Tools)</Label>
              <p className="text-sm text-muted-foreground">
                Choose what financial data this agent can access and analyze.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {toolOptions.map((tool) => {
                  const Icon = tool.icon
                  const isSelected = selectedTools.includes(tool.id)
                  
                  return (
                    <Card 
                      key={tool.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "border-orange-500 bg-orange-500/5" : "hover:border-muted-foreground/50"
                      }`}
                      onClick={() => handleToggleTool(tool.id)}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${
                          isSelected 
                            ? "bg-orange-500/20 text-orange-500" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                        </div>
                        <div className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? "bg-orange-500 border-orange-500 text-white" 
                            : "border-muted-foreground/30"
                        }`}>
                          {isSelected && (
                            <svg className="size-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !systemPrompt.trim()}>
              {isLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

