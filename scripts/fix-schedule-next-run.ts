#!/usr/bin/env npx tsx
/**
 * Fix Schedule next_run_at Values
 * 
 * This script recalculates and updates the next_run_at for all workspace schedules
 * that have stale or incorrect values.
 * 
 * Run with: npx tsx scripts/fix-schedule-next-run.ts
 * 
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/admin/.env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env from admin app
config({ path: resolve(__dirname, '../apps/admin/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure apps/admin/.env.local exists with these variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Parse a cron part into array of allowed values
 */
function parseCronPart(part: string, min: number, max: number): number[] {
  if (part === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }

  const values: number[] = []
  const segments = part.split(',')

  for (const segment of segments) {
    if (segment.includes('/')) {
      // Step values: */5 or 0-30/5
      const [range, step] = segment.split('/')
      const stepNum = parseInt(step, 10)
      let start = min
      let end = max

      if (range !== '*') {
        if (range.includes('-')) {
          const [s, e] = range.split('-')
          start = parseInt(s, 10)
          end = parseInt(e, 10)
        } else {
          start = parseInt(range, 10)
        }
      }

      for (let i = start; i <= end; i += stepNum) {
        values.push(i)
      }
    } else if (segment.includes('-')) {
      // Ranges: 1-5
      const [start, end] = segment.split('-')
      for (let i = parseInt(start, 10); i <= parseInt(end, 10); i++) {
        values.push(i)
      }
    } else {
      // Single values
      values.push(parseInt(segment, 10))
    }
  }

  return values.filter(v => v >= min && v <= max)
}

/**
 * Calculate next run time from cron expression
 */
function getNextRunTime(cronExpression: string, timezone: string = 'UTC', after: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${cronExpression}`)
  }

  const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts

  const minutes = parseCronPart(minutePart, 0, 59)
  const hours = parseCronPart(hourPart, 0, 23)
  const days = parseCronPart(dayPart, 1, 31)
  const months = parseCronPart(monthPart, 1, 12)
  const weekdays = parseCronPart(weekdayPart, 0, 6)

  // Start from the minute after 'after'
  const current = new Date(after)
  current.setSeconds(0, 0)
  current.setMinutes(current.getMinutes() + 1)

  // Search for next valid time (up to 2 years ahead)
  const maxIterations = 525600
  for (let i = 0; i < maxIterations; i++) {
    const month = current.getMonth() + 1
    const day = current.getDate()
    const hour = current.getHours()
    const minute = current.getMinutes()
    const weekday = current.getDay()

    if (
      months.includes(month) &&
      days.includes(day) &&
      hours.includes(hour) &&
      minutes.includes(minute) &&
      (weekdays.length === 7 || weekdays.includes(weekday))
    ) {
      return current
    }

    current.setMinutes(current.getMinutes() + 1)
  }

  throw new Error(`Could not find next run time for: ${cronExpression}`)
}

async function fixSchedules() {
  console.log('=== Fix Schedule next_run_at Values ===\n')

  // Get all workspace schedules (non-templates)
  const { data: schedules, error } = await supabase
    .from('agent_schedules')
    .select('id, name, cron_expression, timezone, next_run_at, is_enabled')
    .eq('is_template', false)
    .not('workspace_id', 'is', null)

  if (error) {
    console.error('Error fetching schedules:', error.message)
    process.exit(1)
  }

  console.log(`Found ${schedules?.length || 0} workspace schedules\n`)

  if (!schedules || schedules.length === 0) {
    console.log('No schedules to fix')
    return
  }

  const now = new Date()
  let updated = 0
  let errors = 0

  for (const schedule of schedules) {
    try {
      const nextRun = getNextRunTime(
        schedule.cron_expression,
        schedule.timezone || 'UTC',
        now
      )

      const { error: updateError } = await supabase
        .from('agent_schedules')
        .update({ next_run_at: nextRun.toISOString() })
        .eq('id', schedule.id)

      if (updateError) {
        console.error(`  ✗ ${schedule.name}: ${updateError.message}`)
        errors++
      } else {
        console.log(`  ✓ ${schedule.name}: ${nextRun.toISOString()}`)
        updated++
      }
    } catch (err) {
      console.error(`  ✗ ${schedule.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      errors++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total: ${schedules.length}`)
}

fixSchedules().catch(console.error)
