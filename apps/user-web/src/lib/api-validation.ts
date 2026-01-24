import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Safely parses a JSON request body with optional Zod schema validation.
 *
 * Returns a discriminated union:
 * - `{ data: T }` on success
 * - `{ error: NextResponse }` on failure (malformed JSON or validation error)
 *
 * Usage:
 * ```ts
 * const result = await parseRequestBody(request, mySchema)
 * if ('error' in result) return result.error
 * const { field1, field2 } = result.data
 * ```
 */
export async function parseRequestBody<T>(
  request: Request,
  schema?: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    }
  }

  if (schema) {
    const result = schema.safeParse(body)
    if (!result.success) {
      return {
        error: NextResponse.json(
          { error: 'Validation failed', details: result.error.flatten() },
          { status: 400 }
        ),
      }
    }
    return { data: result.data }
  }

  return { data: body as T }
}
