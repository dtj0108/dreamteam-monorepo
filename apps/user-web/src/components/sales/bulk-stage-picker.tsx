"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { LeadPipeline, LeadPipelineStage } from "@/types/customization"

interface BulkStagePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelines: LeadPipeline[]
  selectedCount: number
  onApply: (stageId: string) => Promise<void>
}

export function BulkStagePicker({
  open,
  onOpenChange,
  pipelines,
  selectedCount,
  onApply,
}: BulkStagePickerProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Flatten all stages from all pipelines
  const allStages = pipelines.flatMap((pipeline) =>
    (pipeline.stages || []).map((stage) => ({
      ...stage,
      pipelineName: pipeline.name,
    }))
  )

  const handleApply = async () => {
    if (!selectedStageId) return

    setIsLoading(true)
    try {
      await onApply(selectedStageId)
      setSelectedStageId(null)
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedStageId(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
          <DialogDescription>
            Move {selectedCount} lead{selectedCount !== 1 ? "s" : ""} to a new stage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[300px] overflow-y-auto">
          <RadioGroup
            value={selectedStageId || ""}
            onValueChange={setSelectedStageId}
          >
            {pipelines.map((pipeline) => (
              <div key={pipeline.id} className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {pipeline.name}
                </h4>
                <div className="space-y-2">
                  {(pipeline.stages || [])
                    .sort((a, b) => a.position - b.position)
                    .map((stage) => (
                      <div
                        key={stage.id}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem value={stage.id} id={stage.id} />
                        <Label
                          htmlFor={stage.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {stage.color && (
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                          )}
                          <span>{stage.name}</span>
                          {stage.is_won && (
                            <span className="text-xs text-green-600">(Won)</span>
                          )}
                          {stage.is_lost && (
                            <span className="text-xs text-red-600">(Lost)</span>
                          )}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </RadioGroup>

          {allStages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No stages available. Create a pipeline first.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedStageId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
