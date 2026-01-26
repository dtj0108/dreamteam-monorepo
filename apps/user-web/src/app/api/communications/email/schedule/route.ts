import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { isValid } = await validateWorkspaceAccess(workspaceId, session.id)
    if (!isValid) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
    }

    const body = await request.json()
    const { grantId, toEmail, toName, subject, body: emailBody, leadId, contactId, scheduledFor } = body

    if (!grantId) {
      return NextResponse.json(
        { error: 'A connected email account is required' },
        { status: 400 }
      )
    }

    if (!toEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'Scheduled time is required' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled time format' },
        { status: 400 }
      )
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify the grant belongs to this user/workspace
    const { data: grant, error: grantError } = await supabase
      .from('nylas_grants')
      .select('id')
      .eq('id', grantId)
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.id)
      .single()

    if (grantError || !grant) {
      return NextResponse.json(
        { error: 'Connected email account not found or not owned by you' },
        { status: 403 }
      )
    }

    // Create scheduled email record
    const { data: scheduled, error: insertError } = await supabase
      .from('scheduled_emails')
      .insert({
        user_id: session.id,
        workspace_id: workspaceId,
        lead_id: leadId || null,
        contact_id: contactId || null,
        grant_id: grantId,
        to_email: toEmail,
        to_name: toName || null,
        subject,
        body: emailBody || '',
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating scheduled email:', insertError)
      return NextResponse.json({
        error: `Failed to schedule email: ${insertError.message}`,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduledEmail: scheduled,
    })
  } catch (error) {
    console.error('Error scheduling email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
