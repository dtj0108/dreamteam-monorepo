/**
 * Test helpers for validating MCP tool responses
 *
 * All MCP tools return a ToolResult with content array and optional isError flag.
 * These helpers make it easy to validate success/error states and extract data.
 */

import { expect } from 'vitest'
import type { ToolResult } from '../../types.js'

/**
 * Parse the JSON content from a tool result
 */
export function parseResult<T = unknown>(result: ToolResult): T {
  const text = result.content[0]?.text
  if (!text) {
    throw new Error('Result has no content')
  }
  return JSON.parse(text) as T
}

/**
 * Assert that a result is a success (no error flag)
 */
export function expectSuccess(result: ToolResult): void {
  expect(result.isError).toBeFalsy()
  expect(result.content).toHaveLength(1)
  expect(result.content[0].type).toBe('text')
}

/**
 * Assert that a result is a success and return parsed data
 */
export function expectSuccessWithData<T = unknown>(result: ToolResult): T {
  expectSuccess(result)
  return parseResult<T>(result)
}

/**
 * Assert that a result is an error
 */
export function expectError(result: ToolResult, messageContains?: string): void {
  expect(result.isError).toBe(true)
  expect(result.content).toHaveLength(1)
  expect(result.content[0].type).toBe('text')

  if (messageContains) {
    const data = parseResult<{ error: string }>(result)
    expect(data.error).toContain(messageContains)
  }
}

/**
 * Assert that a result is an access denied error
 */
export function expectAccessDenied(result: ToolResult): void {
  expectError(result, 'Access denied')
}

/**
 * Assert that a result is a not found error
 */
export function expectNotFound(result: ToolResult, entityType?: string): void {
  expectError(result, entityType ? `${entityType} not found` : 'not found')
}

/**
 * Assert that a result is a database error
 */
export function expectDatabaseError(result: ToolResult): void {
  expectError(result, 'Database error')
}

/**
 * Assert a list result has the expected count
 */
export function expectListResult<T>(
  result: ToolResult,
  options: {
    itemsKey: string
    countKey?: string
    expectedCount?: number
  }
): T[] {
  const data = expectSuccessWithData<Record<string, unknown>>(result)
  const items = data[options.itemsKey] as T[]

  expect(Array.isArray(items)).toBe(true)

  if (options.countKey) {
    expect(data[options.countKey]).toBe(items.length)
  }

  if (options.expectedCount !== undefined) {
    expect(items).toHaveLength(options.expectedCount)
  }

  return items
}

/**
 * Assert a create/update result contains the expected message and entity
 */
export function expectMutationResult<T>(
  result: ToolResult,
  options: {
    messageContains: string
    entityKey: string
  }
): T {
  const data = expectSuccessWithData<Record<string, unknown>>(result)

  expect(data.message).toContain(options.messageContains)
  expect(data[options.entityKey]).toBeDefined()

  return data[options.entityKey] as T
}

/**
 * Assert a delete result contains success message
 */
export function expectDeleteResult(result: ToolResult, idKey?: string): void {
  const data = expectSuccessWithData<Record<string, unknown>>(result)
  expect(data.message).toContain('deleted')

  if (idKey) {
    expect(data[idKey]).toBeDefined()
  }
}
