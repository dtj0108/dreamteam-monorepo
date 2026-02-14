'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const MAX_UPLOAD_MB = 25
const DOC_TYPE_CONFIG = [
  {
    value: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'Public policy describing data collection and usage.',
  },
  {
    value: 'terms-of-service',
    title: 'Terms of Service',
    description: 'Public terms for platform and app usage.',
  },
  {
    value: 'cookie-policy',
    title: 'Cookie Policy',
    description: 'Public cookie and tracking disclosures.',
  },
  {
    value: 'data-processing-addendum',
    title: 'Data Processing Addendum',
    description: 'Public DPA and processing obligations.',
  },
] as const

type LegalDocType = (typeof DOC_TYPE_CONFIG)[number]['value']
type ListedDocType = LegalDocType | 'legacy'
type FileMap = Partial<Record<LegalDocType, File>>
type KeyMap = Record<LegalDocType, number>
type DocTypeUrlMap = Record<LegalDocType, string>
type CurrentDocMap = Record<LegalDocType, LegalDoc | null>

interface LegalDoc {
  name: string
  displayName: string
  path: string
  publicUrl: string
  size: number | null
  createdAt: string | null
  contentType: string | null
  docType: ListedDocType
}

function buildInitialInputKeys(): KeyMap {
  return {
    'privacy-policy': 0,
    'terms-of-service': 0,
    'cookie-policy': 0,
    'data-processing-addendum': 0,
  }
}

function buildDocTypeUrlMap(): DocTypeUrlMap {
  return {
    'privacy-policy': '',
    'terms-of-service': '',
    'cookie-policy': '',
    'data-processing-addendum': '',
  }
}

function buildCurrentDocMap(): CurrentDocMap {
  return {
    'privacy-policy': null,
    'terms-of-service': null,
    'cookie-policy': null,
    'data-processing-addendum': null,
  }
}

function isLegalDocType(value: ListedDocType): value is LegalDocType {
  return value !== 'legacy'
}

function formatBytes(size: number | null) {
  if (!size) return 'Unknown size'
  const mb = size / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  return `${(size / 1024).toFixed(1)} KB`
}

function mergeDocTypeUrls(
  incoming: Partial<Record<LegalDocType, string>> | undefined
): DocTypeUrlMap {
  return {
    ...buildDocTypeUrlMap(),
    ...(incoming ?? {}),
  }
}

export default function LegalDocsPage() {
  const [docs, setDocs] = useState<LegalDoc[]>([])
  const [docTypeUrls, setDocTypeUrls] = useState<DocTypeUrlMap>(
    buildDocTypeUrlMap
  )
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<FileMap>({})
  const [fileInputKeys, setFileInputKeys] = useState<KeyMap>(
    buildInitialInputKeys
  )
  const [uploadingDocType, setUploadingDocType] = useState<LegalDocType | null>(
    null
  )
  const [deletingDocType, setDeletingDocType] = useState<LegalDocType | null>(
    null
  )
  const [draggingDocType, setDraggingDocType] = useState<LegalDocType | null>(
    null
  )

  const { currentDocs, legacyDocs } = useMemo(() => {
    const current = buildCurrentDocMap()
    const legacy: LegalDoc[] = []

    for (const doc of docs) {
      if (isLegalDocType(doc.docType)) {
        if (!current[doc.docType]) {
          current[doc.docType] = doc
        }
      } else {
        legacy.push(doc)
      }
    }

    return { currentDocs: current, legacyDocs: legacy }
  }, [docs])

  async function loadDocs() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/legal-docs')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load legal docs')
      }

      const data = (await response.json()) as {
        docs: LegalDoc[]
        docTypeUrls?: Partial<Record<LegalDocType, string>>
      }

      setDocs(data.docs || [])
      setDocTypeUrls(mergeDocTypeUrls(data.docTypeUrls))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load legal docs'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [])

  function getFileValidationError(file: File) {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) return 'Only PDF files are allowed'

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return `File is too large. Max size is ${MAX_UPLOAD_MB}MB`
    }

    return null
  }

  function onFileChange(docType: LegalDocType, file: File | null) {
    if (file) {
      const fileValidationError = getFileValidationError(file)
      if (fileValidationError) {
        toast.error(fileValidationError)
        return
      }
    }

    setSelectedFiles((current) => ({
      ...current,
      [docType]: file ?? undefined,
    }))
  }

  function resetInputForType(docType: LegalDocType) {
    setFileInputKeys((current) => ({
      ...current,
      [docType]: current[docType] + 1,
    }))
  }

  async function handleUpload(docType: LegalDocType) {
    const file = selectedFiles[docType]
    if (!file) {
      toast.error('Pick a PDF file first')
      return
    }

    const fileValidationError = getFileValidationError(file)
    if (fileValidationError) {
      toast.error(fileValidationError)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('docType', docType)

    try {
      setUploadingDocType(docType)
      const response = await fetch('/api/admin/legal-docs', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = (await response.json()) as {
        doc: LegalDoc
        docTypeUrls?: Partial<Record<LegalDocType, string>>
      }

      setDocs((current) => {
        const filtered = current.filter((doc) => doc.docType !== docType)
        return [data.doc, ...filtered]
      })
      setDocTypeUrls(mergeDocTypeUrls(data.docTypeUrls))
      setSelectedFiles((current) => ({ ...current, [docType]: undefined }))
      resetInputForType(docType)
      toast.success(
        `${DOC_TYPE_CONFIG.find((item) => item.value === docType)?.title} uploaded`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploadingDocType(null)
    }
  }

  async function copyUrl(url: string) {
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Public URL copied')
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  async function handleDelete(docType: LegalDocType) {
    const docTypeLabel =
      DOC_TYPE_CONFIG.find((item) => item.value === docType)?.title ||
      'selected document'

    const confirmed = window.confirm(
      `Delete the current ${docTypeLabel} PDF?\n\nThis removes the hosted file from storage.`
    )
    if (!confirmed) return

    try {
      setDeletingDocType(docType)
      const response = await fetch(
        `/api/admin/legal-docs?docType=${encodeURIComponent(docType)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      const data = (await response.json()) as {
        docTypeUrls?: Partial<Record<LegalDocType, string>>
      }

      setDocs((current) => current.filter((doc) => doc.docType !== docType))
      setDocTypeUrls(mergeDocTypeUrls(data.docTypeUrls))
      setSelectedFiles((current) => ({ ...current, [docType]: undefined }))
      resetInputForType(docType)
      toast.success(`${docTypeLabel} PDF deleted`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setDeletingDocType(null)
    }
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
    docType: LegalDocType,
    isDisabled: boolean
  ) {
    event.preventDefault()
    setDraggingDocType(null)
    if (isDisabled) return

    const droppedFile = event.dataTransfer.files?.[0] || null
    onFileChange(docType, droppedFile)
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
    docType: LegalDocType,
    isDisabled: boolean
  ) {
    if (isDisabled) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDraggingDocType(docType)
  }

  function handleDragLeave(
    event: React.DragEvent<HTMLDivElement>,
    docType: LegalDocType
  ) {
    const relatedTarget = event.relatedTarget as Node | null
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return

    if (draggingDocType === docType) {
      setDraggingDocType(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Legal Docs</h1>
          <p className="text-muted-foreground">
            Each doc type has one canonical public URL that stays fixed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDocs}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {DOC_TYPE_CONFIG.map((docTypeConfig) => {
        const currentDoc = currentDocs[docTypeConfig.value]
        const selectedFile = selectedFiles[docTypeConfig.value]
        const isUploading = uploadingDocType === docTypeConfig.value
        const isDeleting = deletingDocType === docTypeConfig.value
        const isDropDisabled = isUploading || isDeleting
        const isDragActive = draggingDocType === docTypeConfig.value
        const publicUrl =
          docTypeUrls[docTypeConfig.value] || currentDoc?.publicUrl || ''
        const inputId = `legal-doc-upload-${docTypeConfig.value}`

        return (
          <Card key={docTypeConfig.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {docTypeConfig.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {docTypeConfig.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20'
                } ${isDropDisabled ? 'opacity-60' : ''}`}
                onDragEnter={(event) =>
                  handleDragOver(event, docTypeConfig.value, isDropDisabled)
                }
                onDragOver={(event) =>
                  handleDragOver(event, docTypeConfig.value, isDropDisabled)
                }
                onDragLeave={(event) =>
                  handleDragLeave(event, docTypeConfig.value)
                }
                onDrop={(event) =>
                  handleDrop(event, docTypeConfig.value, isDropDisabled)
                }
              >
                <input
                  id={inputId}
                  key={fileInputKeys[docTypeConfig.value]}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={isDropDisabled}
                  className="hidden"
                  onChange={(event) =>
                    onFileChange(docTypeConfig.value, event.target.files?.[0] || null)
                  }
                />
                <label
                  htmlFor={inputId}
                  className={`inline-block text-sm ${
                    isDropDisabled
                      ? 'cursor-not-allowed text-muted-foreground'
                      : 'cursor-pointer text-foreground'
                  }`}
                >
                  Drag and drop a PDF here, or click to browse.
                </label>
                {selectedFile ? (
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF only, up to {MAX_UPLOAD_MB}MB.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleUpload(docTypeConfig.value)}
                  disabled={!selectedFile || isUploading || isDeleting}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {selectedFile
                    ? `Ready to upload: ${selectedFile.name}`
                    : 'Select a PDF first.'}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">Public URL</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyUrl(publicUrl)}
                      disabled={!publicUrl}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy Link
                    </Button>
                    <a
                      href={publicUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        if (!publicUrl) event.preventDefault()
                      }}
                    >
                      <Button variant="outline" size="sm" disabled={!publicUrl}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Open
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="mt-3">
                  <Input readOnly value={publicUrl} className="h-9 text-xs" />
                </div>
              </div>

              {currentDoc ? (
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{currentDoc.displayName}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(docTypeConfig.value)}
                      disabled={isUploading || isDeleting}
                      aria-label={`Delete ${docTypeConfig.title} PDF`}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(currentDoc.size)}
                    {currentDoc.createdAt
                      ? ` • Updated ${new Date(currentDoc.createdAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No PDF uploaded yet. The URL above is reserved for this doc type.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {legacyDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy / Uncategorized PDFs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {legacyDocs.map((doc) => (
              <div key={doc.path} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{doc.displayName}</p>
                <Input readOnly value={doc.publicUrl} className="mt-2 h-8 text-xs" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
