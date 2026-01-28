import { NextRequest, NextResponse } from "next/server"
import { processScheduledWorkflows, getScheduledWorkflowStats } from "@/lib/scheduled-workflow-processor"
import { checkRateLimit, getRateLimitHeaders, rateLimitPresets } from "@dreamteam/auth"

// This endpoint processes scheduled workflow actions
// It should be called by a cron job (e.g., every minute via Vercel cron)
// Optionally secured by a secret key

export async function GET(request: NextRequest) {
  // Rate limiting - use IP address as identifier
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.cron)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  // Optional: Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processScheduledWorkflows()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error processing scheduled workflows:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check stats without processing
export async function POST(request: NextRequest) {
  // Rate limiting - use IP address as identifier
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.cron)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  // Optional: Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await getScheduledWorkflowStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error getting workflow stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
