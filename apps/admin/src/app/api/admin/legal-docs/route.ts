import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction, requireSuperadmin } from '@/lib/admin-auth'

const LEGAL_DOCS_BUCKET = 'legal-docs'
const MAX_PDF_BYTES = 25 * 1024 * 1024 // 25 MB
const LEGAL_DOC_TYPES = [
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
  'data-processing-addendum',
] as const
const LEGAL_DOC_FILE_NAMES: Record<LegalDocType, string> = {
  'privacy-policy': 'privacy-policy.pdf',
  'terms-of-service': 'terms-of-service.pdf',
  'cookie-policy': 'cookie-policy.pdf',
  'data-processing-addendum': 'data-processing-addendum.pdf',
}

type LegalDocType = (typeof LEGAL_DOC_TYPES)[number]
type ListedDocType = LegalDocType | 'legacy'

interface LegalDoc {
  id: string
  name: string
  displayName: string
  path: string
  publicUrl: string
  size: number | null
  createdAt: string | null
  contentType: string | null
  docType: ListedDocType
}

interface LegalDocRow {
  id: string
  doc_type: string
  display_name: string
  file_name: string
  storage_path: string
  public_url: string
  file_size_bytes: number | null
  content_type: string | null
  created_at: string
}

const LEGAL_DOC_TYPE_SET = new Set<string>(LEGAL_DOC_TYPES)

function isLegalDocType(value: unknown): value is LegalDocType {
  return typeof value === 'string' && LEGAL_DOC_TYPE_SET.has(value)
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().replace(/\s+/g, '-')
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function displayNameFromStoredName(storedName: string): string {
  const match = storedName.match(/^\d+-[0-9a-fA-F-]+-(.+)$/)
  return match?.[1] ?? storedName
}

function normalizeCustomPublicBaseUrl() {
  const rawBaseUrl = process.env.LEGAL_DOCS_PUBLIC_BASE_URL?.trim()
  if (!rawBaseUrl) return null

  const withProtocol = rawBaseUrl.startsWith('http')
    ? rawBaseUrl
    : `https://${rawBaseUrl}`

  try {
    const url = new URL(withProtocol)
    return { protocol: url.protocol, host: url.host }
  } catch {
    return null
  }
}

const CUSTOM_PUBLIC_BASE_URL = normalizeCustomPublicBaseUrl()

function rewritePublicUrlHost(publicUrl: string) {
  if (!CUSTOM_PUBLIC_BASE_URL) return publicUrl

  try {
    const url = new URL(publicUrl)
    url.protocol = CUSTOM_PUBLIC_BASE_URL.protocol
    url.host = CUSTOM_PUBLIC_BASE_URL.host
    return url.toString()
  } catch {
    return publicUrl
  }
}

function storagePathForDocType(docType: LegalDocType) {
  return `canonical/${LEGAL_DOC_FILE_NAMES[docType]}`
}

function buildPublicUrlForPath(supabase: SupabaseClient, storagePath: string) {
  const { data } = supabase.storage
    .from(LEGAL_DOCS_BUCKET)
    .getPublicUrl(storagePath)
  return rewritePublicUrlHost(data.publicUrl)
}

function mapRowToLegalDoc(row: LegalDocRow, supabase: SupabaseClient): LegalDoc {
  const parsedDocType: ListedDocType = LEGAL_DOC_TYPE_SET.has(row.doc_type)
    ? (row.doc_type as LegalDocType)
    : 'legacy'

  return {
    id: row.id,
    name: row.file_name,
    displayName: row.display_name || displayNameFromStoredName(row.file_name),
    path: row.storage_path,
    publicUrl: buildPublicUrlForPath(supabase, row.storage_path),
    size: row.file_size_bytes,
    createdAt: row.created_at,
    contentType: row.content_type,
    docType: parsedDocType,
  }
}

async function ensurePublicBucket(supabase: SupabaseClient) {
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(
    LEGAL_DOCS_BUCKET
  )

  if (bucketError) {
    const { error: createError } = await supabase.storage.createBucket(
      LEGAL_DOCS_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_PDF_BYTES,
        allowedMimeTypes: ['application/pdf'],
      }
    )

    if (createError) {
      throw createError
    }
    return
  }

  if (!bucket.public) {
    const { error: updateError } = await supabase.storage.updateBucket(
      LEGAL_DOCS_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_PDF_BYTES,
        allowedMimeTypes: ['application/pdf'],
      }
    )

    if (updateError) {
      throw updateError
    }
  }
}

function sortDocsByCreatedAt(docs: LegalDoc[]) {
  return docs.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })
}

function buildDocTypeUrls(supabase: SupabaseClient) {
  return Object.fromEntries(
    LEGAL_DOC_TYPES.map((docType) => [
      docType,
      buildPublicUrlForPath(supabase, storagePathForDocType(docType)),
    ])
  ) as Record<LegalDocType, string>
}

function pickLatestActiveRows(rows: LegalDocRow[]) {
  const seenDocTypes = new Set<string>()
  const latestRows: LegalDocRow[] = []

  for (const row of rows) {
    if (!LEGAL_DOC_TYPE_SET.has(row.doc_type)) continue
    if (seenDocTypes.has(row.doc_type)) continue
    seenDocTypes.add(row.doc_type)
    latestRows.push(row)
  }

  return latestRows
}

function isIgnorableStorageDeleteError(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('not found') ||
    normalized.includes('no such') ||
    normalized.includes('does not exist')
  )
}

export async function GET() {
  const { error: authError } = await requireSuperadmin()
  if (authError) return authError

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('legal_docs')
      .select(
        'id, doc_type, display_name, file_name, storage_path, public_url, file_size_bytes, content_type, created_at'
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json(
        { error: `Failed to load legal docs from database: ${error.message}` },
        { status: 500 }
      )
    }

    const latestRows = pickLatestActiveRows((data ?? []) as LegalDocRow[])

    return NextResponse.json({
      docs: sortDocsByCreatedAt(latestRows.map((row) => mapRowToLegalDoc(row, supabase))),
      docTypes: LEGAL_DOC_TYPES,
      docTypeUrls: buildDocTypeUrls(supabase),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load legal documents',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireSuperadmin()
  if (authError) return authError
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const uploaded = formData.get('file')
    const docTypeEntry = formData.get('docType')

    if (!isLegalDocType(docTypeEntry)) {
      return NextResponse.json(
        {
          error:
            'Invalid docType. Must be one of: privacy-policy, terms-of-service, cookie-policy, data-processing-addendum.',
        },
        { status: 400 }
      )
    }

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        { error: 'A PDF file is required.' },
        { status: 400 }
      )
    }

    if (uploaded.size === 0) {
      return NextResponse.json(
        { error: 'The selected file is empty.' },
        { status: 400 }
      )
    }

    if (uploaded.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `File is too large. Max size is ${MAX_PDF_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    const isPdf =
      uploaded.type === 'application/pdf' ||
      uploaded.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    await ensurePublicBucket(supabase)

    const safeName = sanitizeFileName(uploaded.name)
    const filePath = storagePathForDocType(docTypeEntry)
    const storedFileName = LEGAL_DOC_FILE_NAMES[docTypeEntry]
    const fileBuffer = Buffer.from(await uploaded.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(LEGAL_DOCS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const canonicalPublicUrl = buildPublicUrlForPath(supabase, filePath)

    const { data: existingRows, error: existingRowsError } = await supabase
      .from('legal_docs')
      .select(
        'id, doc_type, display_name, file_name, storage_path, public_url, file_size_bytes, content_type, created_at'
      )
      .eq('doc_type', docTypeEntry)
      .order('created_at', { ascending: false })
      .limit(100)

    if (existingRowsError) {
      return NextResponse.json(
        { error: `Failed to load legal doc metadata: ${existingRowsError.message}` },
        { status: 500 }
      )
    }

    const typedExistingRows = (existingRows ?? []) as LegalDocRow[]
    const primaryRow =
      typedExistingRows.find((row) => row.storage_path === filePath) ??
      typedExistingRows[0]

    let savedDoc: LegalDocRow | null = null

    if (primaryRow) {
      const { data: updatedDoc, error: updateError } = await supabase
        .from('legal_docs')
        .update({
          display_name: safeName,
          file_name: storedFileName,
          storage_bucket: LEGAL_DOCS_BUCKET,
          storage_path: filePath,
          public_url: canonicalPublicUrl,
          file_size_bytes: uploaded.size,
          content_type: 'application/pdf',
          uploaded_by: user.id,
          is_active: true,
        })
        .eq('id', primaryRow.id)
        .select(
          'id, doc_type, display_name, file_name, storage_path, public_url, file_size_bytes, content_type, created_at'
        )
        .single()

      if (updateError || !updatedDoc) {
        return NextResponse.json(
          {
            error: `Failed to update legal doc metadata: ${updateError?.message || 'Unknown error'}`,
          },
          { status: 500 }
        )
      }

      savedDoc = updatedDoc as LegalDocRow
    } else {
      const { data: insertedDoc, error: insertError } = await supabase
        .from('legal_docs')
        .insert({
          doc_type: docTypeEntry,
          display_name: safeName,
          file_name: storedFileName,
          storage_bucket: LEGAL_DOCS_BUCKET,
          storage_path: filePath,
          public_url: canonicalPublicUrl,
          file_size_bytes: uploaded.size,
          content_type: 'application/pdf',
          uploaded_by: user.id,
          is_active: true,
        })
        .select(
          'id, doc_type, display_name, file_name, storage_path, public_url, file_size_bytes, content_type, created_at'
        )
        .single()

      if (insertError || !insertedDoc) {
        return NextResponse.json(
          {
            error: `Failed to save legal doc metadata: ${insertError?.message || 'Unknown error'}`,
          },
          { status: 500 }
        )
      }

      savedDoc = insertedDoc as LegalDocRow
    }

    const outdatedRows = typedExistingRows.filter((row) => row.id !== savedDoc.id)
    if (outdatedRows.length > 0) {
      await supabase
        .from('legal_docs')
        .update({ is_active: false })
        .eq('doc_type', docTypeEntry)
        .neq('id', savedDoc.id)

      const obsoletePaths = Array.from(
        new Set(
          outdatedRows
            .map((row) => row.storage_path)
            .filter((path) => path && path !== filePath)
        )
      )

      if (obsoletePaths.length > 0) {
        await supabase.storage.from(LEGAL_DOCS_BUCKET).remove(obsoletePaths)
      }
    }

    await logAdminAction(
      user.id,
      'upload_legal_doc',
      'legal_doc',
      filePath,
      {
        bucket: LEGAL_DOCS_BUCKET,
        legal_doc_id: savedDoc.id,
        doc_type: docTypeEntry,
        file_name: uploaded.name,
        file_size: uploaded.size,
        public_url: canonicalPublicUrl,
      },
      request
    )

    return NextResponse.json(
      {
        doc: mapRowToLegalDoc(savedDoc, supabase),
        docTypeUrls: buildDocTypeUrls(supabase),
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload legal document',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await requireSuperadmin()
  if (authError) return authError
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const docTypeEntry = searchParams.get('docType')

    if (!isLegalDocType(docTypeEntry)) {
      return NextResponse.json(
        {
          error:
            'Invalid docType. Must be one of: privacy-policy, terms-of-service, cookie-policy, data-processing-addendum.',
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const canonicalPath = storagePathForDocType(docTypeEntry)

    const { data: activeRows, error: activeRowsError } = await supabase
      .from('legal_docs')
      .select('id, storage_path')
      .eq('doc_type', docTypeEntry)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (activeRowsError) {
      return NextResponse.json(
        { error: `Failed to load legal doc metadata: ${activeRowsError.message}` },
        { status: 500 }
      )
    }

    const activeIds = (activeRows ?? []).map((row) => row.id)
    const allPathsToRemove = Array.from(
      new Set([
        canonicalPath,
        ...(activeRows ?? [])
          .map((row) => row.storage_path)
          .filter((path): path is string => Boolean(path)),
      ])
    )

    if (activeIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('legal_docs')
        .update({ is_active: false })
        .in('id', activeIds)

      if (deactivateError) {
        return NextResponse.json(
          { error: `Failed to deactivate legal doc metadata: ${deactivateError.message}` },
          { status: 500 }
        )
      }
    }

    if (allPathsToRemove.length > 0) {
      const { error: storageDeleteError } = await supabase.storage
        .from(LEGAL_DOCS_BUCKET)
        .remove(allPathsToRemove)

      if (
        storageDeleteError &&
        !isIgnorableStorageDeleteError(storageDeleteError.message)
      ) {
        return NextResponse.json(
          { error: `Failed to remove PDF from storage: ${storageDeleteError.message}` },
          { status: 500 }
        )
      }
    }

    await logAdminAction(
      user.id,
      'delete_legal_doc',
      'legal_doc',
      canonicalPath,
      {
        bucket: LEGAL_DOCS_BUCKET,
        doc_type: docTypeEntry,
        removed_paths: allPathsToRemove,
        deactivated_doc_ids: activeIds,
      },
      request
    )

    return NextResponse.json({
      success: true,
      docType: docTypeEntry,
      docTypeUrls: buildDocTypeUrls(supabase),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete legal document',
      },
      { status: 500 }
    )
  }
}
