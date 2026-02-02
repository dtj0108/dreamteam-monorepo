/**
 * Shared time context utilities for agent prompts.
 * 
 * Provides consistent date/time context to agents so they know
 * the current date when handling time-relative queries like
 * "transactions from the past week".
 */

/**
 * Format time context for agent execution.
 * Provides unambiguous datetime information for the LLM.
 *
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param simulatedTime - Optional ISO datetime string for time-travel simulations
 * @returns Formatted time context string for inclusion in system prompts
 */
export function formatTimeContext(timezone: string = 'UTC', simulatedTime?: string): string {
  // Use simulated time if provided, otherwise use current time
  const now = simulatedTime ? new Date(simulatedTime) : new Date();

  // ISO format for precision
  const isoTime = now.toISOString();

  // Human-readable format in the specified timezone
  const localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const localTime = localFormatter.format(now);

  // Add indicator when using simulated time
  if (simulatedTime) {
    return `## Execution Time (SIMULATED)
- Date/Time: ${localTime}
- ISO: ${isoTime}
- Timezone: ${timezone}
- Note: This is a simulated execution. The time shown is the scheduled run time, not the actual current time.`;
  }

  return `## Current Time
- Date/Time: ${localTime}
- ISO: ${isoTime}
- Timezone: ${timezone}`;
}
