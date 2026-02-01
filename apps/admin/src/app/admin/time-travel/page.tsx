'use client'

import { TimeMachinePanel } from '@/components/admin/time-machine-panel'
import { Clock } from 'lucide-react'

export default function TimeTravelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="h-8 w-8" />
          Time Travel
        </h1>
        <p className="text-muted-foreground">
          Manipulate schedule times to test scheduled task execution. Force schedules to become due,
          reset them to their cron-calculated times, simulate entire time periods, or trigger the cron checker manually.
        </p>
      </div>

      <TimeMachinePanel />
    </div>
  )
}
