"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import type {
  TriggerType,
  ConditionFieldSource,
  ConditionFieldDefinition,
  WorkflowAction,
} from "@/types/workflow"
import { getFieldsForTrigger } from "@/types/workflow"

interface FieldOption {
  value: string           // Composite value: "source:path" or "source:path:fieldId"
  path: string            // Field path
  label: string           // Display name
  source: ConditionFieldSource
  fieldId?: string        // For custom fields
}

interface ConditionFieldPickerProps {
  triggerType: TriggerType
  value: { source: ConditionFieldSource; path: string; fieldId?: string } | null
  onChange: (field: { source: ConditionFieldSource; path: string; fieldId?: string }) => void
  previousActions?: WorkflowAction[]  // For "previous action" field source
  customFields?: Array<{ id: string; name: string; field_type: string }>
}

export function ConditionFieldPicker({
  triggerType,
  value,
  onChange,
  previousActions = [],
  customFields = [],
}: ConditionFieldPickerProps) {
  // Build options from trigger fields
  const triggerFields = useMemo(() => {
    const fields = getFieldsForTrigger(triggerType)
    return fields.map((f): FieldOption => ({
      value: `trigger:${f.path}`,
      path: f.path,
      label: f.label,
      source: "trigger",
    }))
  }, [triggerType])

  // Build options from custom fields
  const customFieldOptions = useMemo(() => {
    return customFields.map((cf): FieldOption => ({
      value: `custom_field:${cf.name}:${cf.id}`,
      path: cf.name,
      label: cf.name,
      source: "custom_field",
      fieldId: cf.id,
    }))
  }, [customFields])

  // Build options from previous actions (for checking success/failure)
  const previousActionOptions = useMemo(() => {
    const options: FieldOption[] = []
    for (const action of previousActions) {
      if (action.type !== "condition" && action.type !== "wait") {
        options.push({
          value: `previous_action:action.${action.id}.success`,
          path: `action.${action.id}.success`,
          label: `${action.type} (#${action.order + 1}) succeeded`,
          source: "previous_action",
        })
      }
    }
    return options
  }, [previousActions])

  // Combine all options
  const allOptions = useMemo(() => {
    return {
      trigger: triggerFields,
      custom: customFieldOptions,
      previous: previousActionOptions,
    }
  }, [triggerFields, customFieldOptions, previousActionOptions])

  // Convert current value to select value
  const selectValue = useMemo(() => {
    if (!value) return ""
    if (value.fieldId) {
      return `${value.source}:${value.path}:${value.fieldId}`
    }
    return `${value.source}:${value.path}`
  }, [value])

  // Handle selection change
  const handleChange = (compositeValue: string) => {
    const parts = compositeValue.split(":")
    const source = parts[0] as ConditionFieldSource
    const path = parts.slice(1, source === "custom_field" ? -1 : undefined).join(":")
    const fieldId = source === "custom_field" ? parts[parts.length - 1] : undefined

    onChange({ source, path, fieldId })
  }

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a field to check" />
      </SelectTrigger>
      <SelectContent>
        {allOptions.trigger.length > 0 && (
          <SelectGroup>
            <SelectLabel>Trigger Data</SelectLabel>
            {allOptions.trigger.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {allOptions.custom.length > 0 && (
          <SelectGroup>
            <SelectLabel>Custom Fields</SelectLabel>
            {allOptions.custom.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {allOptions.previous.length > 0 && (
          <SelectGroup>
            <SelectLabel>Previous Actions</SelectLabel>
            {allOptions.previous.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {allOptions.trigger.length === 0 &&
          allOptions.custom.length === 0 &&
          allOptions.previous.length === 0 && (
            <SelectItem value="none" disabled>
              No fields available
            </SelectItem>
          )}
      </SelectContent>
    </Select>
  )
}
