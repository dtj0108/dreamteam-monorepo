import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { FILE_CONFIG, categorizeFile } from "@/types/files"
import convert from "heic-convert"

/**
 * Check if file is HEIC/HEIF format (Apple's image format)
 */
function isHeicFile(fileName: string, mimeType: string): boolean {
  const type = mimeType.toLowerCase()
  const name = fileName.toLowerCase()
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  )
}

// Type for raw file data from database query
interface RawWorkspaceFile {
  id: string
  file_name: string
  file_type: string | null
  file_size: number
  storage_path: string
  thumbnail_path: string | null
  created_at: string
  source_message_id: string | null
  source_channel_id: string | null
  source_dm_conversation_id: string | null
  uploader: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  channel: {
    id: string
    name: string
  } | null
}

// POST /api/team/files - Upload a file
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const formData = await request.formData()

    const file = formData.get("file") as File | null
    const workspaceId = formData.get("workspaceId") as string | null
    const channelId = formData.get("channelId") as string | null
    const dmConversationId = formData.get("dmConversationId") as string | null

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: "file and workspaceId are required" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > FILE_CONFIG.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds ${FILE_CONFIG.maxFileSize / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Verify workspace membership
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    let buffer: Buffer = Buffer.from(arrayBuffer)
    let fileName = file.name
    let contentType = file.type

    // Convert HEIC/HEIF to JPEG for browser compatibility
    // Using heic-convert - a pure JavaScript solution that works without native binaries
    if (isHeicFile(file.name, file.type)) {
      try {
        const jpegBuffer = await convert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.9
        })
        buffer = Buffer.from(jpegBuffer)
        fileName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg")
        contentType = "image/jpeg"
      } catch (error) {
        console.error("HEIC conversion failed:", error)
        return NextResponse.json(
          { error: "Failed to convert HEIC image" },
          { status: 500 }
        )
      }
    }

    // Generate unique storage path
    const timestamp = Date.now()
    const uuid = crypto.randomUUID()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const storagePath = `${workspaceId}/messages/${timestamp}-${uuid}-${sanitizedFileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("workspace-files")
      .upload(storagePath, buffer, {
        contentType: contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      )
    }

    // Get signed URL for private bucket (1 hour expiry)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("workspace-files")
      .createSignedUrl(storagePath, 3600)

    if (urlError || !urlData?.signedUrl) {
      console.error("Error creating signed URL:", urlError)
      // Clean up uploaded file if URL generation fails
      await supabase.storage.from("workspace-files").remove([storagePath])
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      )
    }

    // Create workspace_files record
    // Use converted fileName/contentType/size for HEIC files
    const { data: workspaceFile, error: dbError } = await supabase
      .from("workspace_files")
      .insert({
        workspace_id: workspaceId,
        uploaded_by: session.id,
        file_name: fileName,
        file_type: contentType,
        file_size: buffer.length,
        storage_path: storagePath,
        source_channel_id: channelId || null,
        source_dm_conversation_id: dmConversationId || null,
      })
      .select(`
        id,
        file_name,
        file_type,
        file_size,
        storage_path,
        created_at
      `)
      .single()

    if (dbError) {
      console.error("Error creating workspace file record:", dbError)
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from("workspace-files").remove([storagePath])
      return NextResponse.json(
        { error: "Failed to create file record" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: workspaceFile.id,
      fileName: workspaceFile.file_name,
      fileType: workspaceFile.file_type,
      fileSize: workspaceFile.file_size,
      fileUrl: urlData.signedUrl,
      storagePath: workspaceFile.storage_path,
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/team/files - List workspace files
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const workspaceId = searchParams.get("workspaceId")
    const type = searchParams.get("type") // image, document, video, audio, archive, other
    const query = searchParams.get("q")
    const channelId = searchParams.get("channelId")
    const uploaderId = searchParams.get("uploaderId")
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify workspace membership
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Build query
    let dbQuery = supabase
      .from("workspace_files")
      .select(`
        id,
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
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Filter by file type category
    if (type) {
      switch (type) {
        case "image":
          dbQuery = dbQuery.like("file_type", "image/%")
          break
        case "video":
          dbQuery = dbQuery.like("file_type", "video/%")
          break
        case "audio":
          dbQuery = dbQuery.like("file_type", "audio/%")
          break
        case "document":
          dbQuery = dbQuery.or(
            "file_type.like.application/pdf,file_type.like.%document%,file_type.like.%word%,file_type.like.text/%,file_type.like.%spreadsheet%,file_type.like.%excel%,file_type.like.%presentation%,file_type.like.%powerpoint%"
          )
          break
        case "archive":
          dbQuery = dbQuery.or(
            "file_type.like.%zip%,file_type.like.%rar%,file_type.like.%7z%,file_type.like.%gzip%,file_type.like.%tar%"
          )
          break
      }
    }

    // Search by filename
    if (query) {
      dbQuery = dbQuery.ilike("file_name", `%${query}%`)
    }

    // Filter by channel
    if (channelId) {
      dbQuery = dbQuery.eq("source_channel_id", channelId)
    }

    // Filter by uploader
    if (uploaderId) {
      dbQuery = dbQuery.eq("uploaded_by", uploaderId)
    }

    // Pagination cursor
    if (cursor) {
      dbQuery = dbQuery.lt("created_at", cursor)
    }

    const { data: files, error } = await dbQuery

    if (error) {
      console.error("Error fetching files:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform files with signed URLs (for private bucket)
    const rawFiles = files as RawWorkspaceFile[] | null
    const transformedFiles = await Promise.all(
      (rawFiles || []).map(async (file) => {
        // Generate signed URL for the file (1 hour expiry)
        const { data: urlData } = await supabase.storage
          .from("workspace-files")
          .createSignedUrl(file.storage_path, 3600)

        // Generate signed URL for thumbnail if exists
        let thumbnailUrl: string | null = null
        if (file.thumbnail_path) {
          const { data: thumbData } = await supabase.storage
            .from("workspace-files")
            .createSignedUrl(file.thumbnail_path, 3600)
          thumbnailUrl = thumbData?.signedUrl || null
        }

        return {
          id: file.id,
          fileName: file.file_name,
          fileType: file.file_type,
          fileSize: file.file_size,
          fileUrl: urlData?.signedUrl || "",
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
        }
      })
    )

    return NextResponse.json({
      files: transformedFiles,
      hasMore: files?.length === limit,
      nextCursor: files?.length === limit ? files[files.length - 1].created_at : null,
    })
  } catch (error) {
    console.error("Error in GET /api/team/files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
