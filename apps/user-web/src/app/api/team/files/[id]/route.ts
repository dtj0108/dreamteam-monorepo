import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// GET /api/team/files/[id] - Get file details with signed download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get file with uploader info
    const { data: file, error } = await supabase
      .from("workspace_files")
      .select(`
        id,
        workspace_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        thumbnail_path,
        created_at,
        source_message_id,
        source_channel_id,
        source_dm_conversation_id,
        uploader:uploaded_by(id, name, avatar_url),
        channel:source_channel_id(id, name)
      `)
      .eq("id", id)
      .single()

    if (error || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Verify workspace membership
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", file.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not authorized to access this file" },
        { status: 403 }
      )
    }

    // Generate signed URL for the file (1 hour expiry)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("workspace-files")
      .createSignedUrl(file.storage_path, 3600)

    if (signedError || !signedData?.signedUrl) {
      console.error("Error creating signed URL:", signedError)
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      )
    }

    // Generate signed URL for thumbnail if exists
    let thumbnailUrl: string | null = null
    if (file.thumbnail_path) {
      const { data: thumbData } = await supabase.storage
        .from("workspace-files")
        .createSignedUrl(file.thumbnail_path, 3600)
      thumbnailUrl = thumbData?.signedUrl || null
    }

    return NextResponse.json({
      id: file.id,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      fileUrl: signedData.signedUrl,
      downloadUrl: signedData.signedUrl,
      storagePath: file.storage_path,
      thumbnailUrl,
      createdAt: file.created_at,
      uploader: file.uploader
        ? {
            id: file.uploader.id,
            name: file.uploader.name,
            avatarUrl: file.uploader.avatar_url,
          }
        : null,
      source: {
        messageId: file.source_message_id,
        channelId: file.source_channel_id,
        channelName: file.channel?.name || null,
        dmConversationId: file.source_dm_conversation_id,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/team/files/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/team/files/[id] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    // Get file details
    const { data: file, error: fetchError } = await supabase
      .from("workspace_files")
      .select("id, workspace_id, uploaded_by, storage_path")
      .eq("id", id)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if user can delete (uploader or admin/owner)
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", file.workspace_id)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not authorized to access this workspace" },
        { status: 403 }
      )
    }

    const isUploader = file.uploaded_by === session.id
    const isAdminOrOwner = membership.role === "owner" || membership.role === "admin"

    if (!isUploader && !isAdminOrOwner) {
      return NextResponse.json(
        { error: "Only the uploader or workspace admin can delete this file" },
        { status: 403 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("workspace-files")
      .remove([file.storage_path])

    if (storageError) {
      console.error("Error deleting file from storage:", storageError)
      // Continue to delete DB record even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("workspace_files")
      .delete()
      .eq("id", id)

    if (dbError) {
      console.error("Error deleting file record:", dbError)
      return NextResponse.json(
        { error: "Failed to delete file record" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/team/files/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
