import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getSession } from '@dreamteam/auth/session'
import { getCurrentWorkspaceId } from '@/lib/workspace-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    let query = supabase
      .from('conversation_threads')
      .select(`
        *,
        lead:leads(id, name),
        contact:contacts(id, first_name, last_name)
      `)
      .eq('user_id', session.id)
      .eq('workspace_id', workspaceId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get the last message for each thread
    const threadsWithLastMessage = await Promise.all(
      (data || []).map(async (thread: { id: string; phone_number: string; unread_count: number }) => {
        const { data: lastMessage } = await supabase
          .from('communications')
          .select('id, type, direction, body, created_at')
          .eq('user_id', session.id)
          .eq('workspace_id', workspaceId)
          .or(`from_number.eq.${thread.phone_number},to_number.eq.${thread.phone_number}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...thread,
          last_message: lastMessage,
        }
      })
    )

    return NextResponse.json(threadsWithLastMessage)
  } catch (error) {
    console.error('Error fetching threads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await getCurrentWorkspaceId(session.id)
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const body = await request.json()
    const { threadId, markAsRead, archive } = body

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}

    if (markAsRead) {
      updateData.unread_count = 0
    }

    if (archive !== undefined) {
      updateData.is_archived = archive
    }

    const { error } = await supabase
      .from('conversation_threads')
      .update(updateData)
      .eq('id', threadId)
      .eq('user_id', session.id)
      .eq('workspace_id', workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating thread:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
