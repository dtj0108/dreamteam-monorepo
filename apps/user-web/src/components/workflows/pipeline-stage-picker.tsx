"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import { Label } from "@dreamteam/ui/label"
import { Loader2, AlertCircleIcon } from "lucide-react"

const DEFAULT_STAGE_VALUE = "__default__"

interface Pipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

interface PipelineStage {
  id: string
  name: string
  color: string | null
  position: number
  is_won: boolean
  is_lost: boolean
}

interface PipelineStagePickerProps {
  pipelineId?: string
  stageId?: string
  onPipelineChange: (pipelineId: string) => void
  onStageChange: (stageId: string, stageName?: string) => void
  showStageSelector?: boolean
  stageRequired?: boolean
}

export function PipelineStagePicker({
  pipelineId,
  stageId,
  onPipelineChange,
  onStageChange,
  showStageSelector = true,
  stageRequired = false,
}: PipelineStagePickerProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/lead-pipelines", {
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Pipeline API error:", response.status, errorData)
        setError(errorData.error || `Failed to load pipelines (${response.status})`)
        return
      }

      const data = await response.json()
      // API returns array directly, not wrapped in { pipelines: [...] }
      const pipelinesArray = Array.isArray(data) ? data : (data.pipelines || [])
      console.log("Pipelines loaded:", pipelinesArray.length)
      setPipelines(pipelinesArray)
    } catch (err) {
      console.error("Failed to fetch pipelines:", err)
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  const selectedPipeline = pipelines.find(p => p.id === pipelineId)
  const stages = selectedPipeline?.stages || []

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pipeline</Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground h-10 px-3 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pipelines...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pipeline</Label>
          <div className="flex items-center gap-2 text-sm text-red-600 h-10 px-3 border border-red-200 rounded-md bg-red-50">
            <AlertCircleIcon className="h-4 w-4" />
            {error}
          </div>
          <button
            type="button"
            onClick={fetchPipelines}
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (pipelines.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pipeline</Label>
          <p className="text-sm text-muted-foreground">
            No pipelines found. Go to Opportunities to create a pipeline first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Pipeline</Label>
        <Select
          value={pipelineId || ""}
          onValueChange={(value) => {
            onPipelineChange(value)
            // Reset stage when pipeline changes
            onStageChange("")
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showStageSelector && pipelineId && (
        <div className="space-y-2">
          <Label>
            Stage
            {!stageRequired && (
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            )}
          </Label>
          <Select
            value={stageId || DEFAULT_STAGE_VALUE}
            onValueChange={(value) => {
              const selectedStageId = value === DEFAULT_STAGE_VALUE ? "" : value
              const selectedStage = stages.find(s => s.id === selectedStageId)
              onStageChange(selectedStageId, selectedStage?.name)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={stageRequired ? "Select a stage" : "Default to first stage"} />
            </SelectTrigger>
            <SelectContent>
              {!stageRequired && (
                <SelectItem value={DEFAULT_STAGE_VALUE}>Default (first stage)</SelectItem>
              )}
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    {stage.color && (
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                    )}
                    <span>{stage.name}</span>
                    {stage.is_won && (
                      <span className="text-xs text-green-600 ml-auto">Won</span>
                    )}
                    {stage.is_lost && (
                      <span className="text-xs text-red-600 ml-auto">Lost</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
