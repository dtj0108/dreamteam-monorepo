/**
 * Type-safe helper for accessing fields from Supabase joined/embedded relations.
 *
 * Supabase returns joined tables as nested objects, but TypeScript types them as
 * `unknown` or arrays. This helper validates the shape before accessing a field.
 */
export function getJoinedField<T>(data: unknown, field: string): T | null {
  if (data && typeof data === 'object' && !Array.isArray(data) && field in data) {
    return (data as Record<string, T>)[field]
  }
  return null
}
