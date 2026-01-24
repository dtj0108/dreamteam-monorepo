import type { WorkflowCondition, ConditionOperator } from '@/types/workflow'
import type { WorkflowContext, ExecutionResult } from './workflow-executor'

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue({ lead: { status: 'hot' } }, 'lead.status') => 'hot'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Get the field value based on the field source
 */
export function getFieldValue(
  condition: WorkflowCondition,
  context: WorkflowContext,
  previousResults: ExecutionResult[]
): unknown {
  switch (condition.field_source) {
    case 'trigger':
      // Get value from trigger context (lead, contact, deal)
      return getNestedValue(context as unknown as Record<string, unknown>, condition.field_path)

    case 'custom_field':
      // Get value from custom field values map
      if (!condition.field_id) return undefined
      return context.customFieldValues?.[condition.field_id]

    case 'previous_action':
      // Parse path like "action.<actionId>.success" or "action.<actionId>.data.fieldName"
      const parts = condition.field_path.split('.')
      if (parts.length < 3 || parts[0] !== 'action') {
        return undefined
      }
      const actionId = parts[1]
      const actionResult = previousResults.find(r => r.actionId === actionId)
      if (!actionResult) return undefined

      // Get the remaining path from the action result
      const resultPath = parts.slice(2).join('.')
      return getNestedValue(actionResult as unknown as Record<string, unknown>, resultPath)

    default:
      return undefined
  }
}

/**
 * Convert a value to string for comparison
 */
function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

/**
 * Convert a value to number for numeric comparisons
 */
function toNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = Number(value)
  return isNaN(num) ? null : num
}

/**
 * Check if a value is considered empty
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  return false
}

/**
 * Apply a comparison operator to actual and expected values
 */
export function applyOperator(
  actualValue: unknown,
  operator: ConditionOperator,
  expectedValue: string
): boolean {
  switch (operator) {
    case 'equals':
      return toStringValue(actualValue).toLowerCase() === expectedValue.toLowerCase()

    case 'not_equals':
      return toStringValue(actualValue).toLowerCase() !== expectedValue.toLowerCase()

    case 'contains':
      return toStringValue(actualValue).toLowerCase().includes(expectedValue.toLowerCase())

    case 'starts_with':
      return toStringValue(actualValue).toLowerCase().startsWith(expectedValue.toLowerCase())

    case 'greater_than': {
      const actualNum = toNumberValue(actualValue)
      const expectedNum = toNumberValue(expectedValue)
      if (actualNum === null || expectedNum === null) {
        return false
      }
      return actualNum > expectedNum
    }

    case 'less_than': {
      const actualNum = toNumberValue(actualValue)
      const expectedNum = toNumberValue(expectedValue)
      if (actualNum === null || expectedNum === null) {
        return false
      }
      return actualNum < expectedNum
    }

    case 'is_empty':
      return isEmpty(actualValue)

    case 'is_not_empty':
      return !isEmpty(actualValue)

    default:
      return false
  }
}

/**
 * Evaluate a workflow condition against the current context and previous results
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  context: WorkflowContext,
  previousResults: ExecutionResult[]
): boolean {
  // Validate condition has required fields
  if (!condition.field_source || !condition.field_path || !condition.operator) {
    console.warn('Invalid condition: missing required fields', condition)
    return false
  }

  // Get the actual field value
  const actualValue = getFieldValue(condition, context, previousResults)

  // Apply the operator
  return applyOperator(actualValue, condition.operator, condition.value || '')
}
