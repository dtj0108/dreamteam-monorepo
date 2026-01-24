'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, MessageSquare, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SMSUsageLog, type CallUsageLog } from '@/types/addons'

interface UsageTableProps {
  type: 'sms' | 'minutes'
  data: (SMSUsageLog | CallUsageLog)[]
  className?: string
}

function formatPhoneNumber(number: string): string {
  // Simple formatting for US numbers
  const cleaned = number.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return number
}

function DirectionIcon({ direction }: { direction: 'inbound' | 'outbound' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-full',
            direction === 'outbound' ? 'bg-blue-50' : 'bg-emerald-50'
          )}>
            {direction === 'outbound' ? (
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
            ) : (
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">{direction}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function UsageTable({ type, data, className }: UsageTableProps) {
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            {type === 'sms' ? (
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Phone className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-medium mb-1">No usage history yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {type === 'sms'
              ? 'Send your first message to see activity here.'
              : 'Make your first call to see activity here.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (type === 'sms') {
    const smsData = data as SMSUsageLog[]
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead>Number</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsData.map((log, index) => (
                <TableRow key={log.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                  <TableCell className="py-3">
                    <DirectionIcon direction={log.direction} />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {formatPhoneNumber(log.direction === 'outbound' ? log.to_number : log.from_number)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={cn(
                      log.is_mms && 'bg-purple-50 text-purple-700 border-purple-200'
                    )}>
                      {log.is_mms ? '3 (MMS)' : log.credits_consumed}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  // Call minutes table
  const callData = data as CallUsageLog[]
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Number</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Minutes</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {callData.map((log, index) => (
              <TableRow key={log.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                <TableCell className="py-3">
                  <DirectionIcon direction={log.direction} />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {formatPhoneNumber(log.direction === 'outbound' ? log.to_number : log.from_number)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                  {formatDuration(log.duration_seconds)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">
                    {log.minutes_consumed.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
