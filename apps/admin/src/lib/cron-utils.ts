/**
 * Cron expression utilities for schedule management
 */

import { CronExpressionParser } from "cron-parser"

/**
 * Parse a cron expression and calculate the next run time
 * Cron format: minute hour day-of-month month day-of-week
 *
 * Examples:
 * - "0 9 * * *" = Daily at 9:00 AM
 * - "0 9 * * 1" = Every Monday at 9:00 AM
 * - "0 9 1 * *" = 1st of each month at 9:00 AM
 * - "0 9 1 1,4,7,10 *" = Quarterly (Jan, Apr, Jul, Oct 1st) at 9:00 AM
 */
export function getNextRunTime(
  cronExpression: string,
  timezone: string = "UTC",
  after: Date = new Date()
): Date {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(`Invalid cron expression: ${cronExpression}`)
  }

  const startAt = new Date(after)
  startAt.setSeconds(0, 0)
  startAt.setMinutes(startAt.getMinutes() + 1)

  // cron-parser v5 expects seconds; prepend if needed
  const fullExpression = parts.length === 5 ? `0 ${cronExpression}` : cronExpression
  const schedule = CronExpressionParser.parse(fullExpression, {
    currentDate: startAt,
    tz: timezone || "UTC",
  })

  const nextRun = schedule.next()
  if (!nextRun) {
    const fallback = new Date(after)
    fallback.setHours(fallback.getHours() + 1)
    return fallback
  }

  return nextRun.toDate()
}

/**
 * Get a human-readable description of a cron expression
 */
export function describeCron(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return 'Invalid cron expression'
  }

  const [minute, hour, day, month, weekday] = parts

  // Common patterns
  if (minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `Daily at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday !== '*') {
    const days = weekday.split(',').map(d => getWeekdayName(parseInt(d, 10))).join(', ')
    return `Every ${days} at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day !== '*' && month === '*' && weekday === '*') {
    return `Monthly on day ${day} at ${formatHour(parseInt(hour, 10))}`
  }

  if (minute === '0' && hour !== '*' && day !== '*' && month !== '*' && weekday === '*') {
    const months = month.split(',').map(m => getMonthName(parseInt(m, 10))).join(', ')
    return `On ${months} ${day} at ${formatHour(parseInt(hour, 10))}`
  }

  return cronExpression
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}

function getWeekdayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day] || 'Unknown'
}

function getMonthName(month: number): string {
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month] || 'Unknown'
}

/**
 * Validate a cron expression
 */
export function isValidCron(cronExpression: string): boolean {
  try {
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length !== 5) return false

    // Try to parse - will throw if invalid
    getNextRunTime(cronExpression)
    return true
  } catch {
    return false
  }
}

/**
 * Get all run times for a cron expression within a time range.
 * Useful for batch simulation of scheduled tasks.
 * 
 * @param cronExpression - Standard 5-field cron expression
 * @param timezone - IANA timezone string
 * @param startTime - Start of the time range (inclusive)
 * @param endTime - End of the time range (inclusive)
 * @param maxRuns - Maximum number of runs to return (default 100, for safety)
 * @returns Array of Date objects representing each run time
 */
export function getAllRunsInRange(
  cronExpression: string,
  timezone: string = 'UTC',
  startTime: Date,
  endTime: Date,
  maxRuns: number = 100
): Date[] {
  const runs: Date[] = []
  
  // Validate inputs
  if (startTime >= endTime) {
    return runs
  }

  // Start searching from just before startTime to catch runs at exactly startTime
  let searchFrom = new Date(startTime.getTime() - 60000) // 1 minute before
  
  while (runs.length < maxRuns) {
    const nextRun = getNextRunTime(cronExpression, timezone, searchFrom)
    
    // If next run is beyond our end time, we're done
    if (nextRun > endTime) {
      break
    }
    
    // Only include if it's within or after our start time
    if (nextRun >= startTime) {
      runs.push(nextRun)
    }
    
    // Search from this run for the next one
    searchFrom = nextRun
  }
  
  return runs
}

/**
 * Preview upcoming runs for a cron expression.
 * Convenience function for UI previews.
 * 
 * @param cronExpression - Standard 5-field cron expression
 * @param timezone - IANA timezone string
 * @param count - Number of upcoming runs to return
 * @param fromTime - Starting point for preview (default: now)
 * @returns Array of Date objects representing upcoming run times
 */
export function getUpcomingRuns(
  cronExpression: string,
  timezone: string = 'UTC',
  count: number = 5,
  fromTime: Date = new Date()
): Date[] {
  const runs: Date[] = []
  let searchFrom = fromTime
  
  for (let i = 0; i < count; i++) {
    const nextRun = getNextRunTime(cronExpression, timezone, searchFrom)
    runs.push(nextRun)
    searchFrom = nextRun
  }
  
  return runs
}
