"use client"

import { Download, FileDown, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToolResultCard } from "./tool-result-card"
import type { DataExportResult as DataExportResultType } from "@/lib/agent"

interface DataExportResultProps {
  result: DataExportResultType
}

export function DataExportResult({ result }: DataExportResultProps) {
  const { success, downloadUrl, filename, recordCount } = result

  const handleDownload = () => {
    if (downloadUrl) {
      // For data URLs, create a download link
      if (downloadUrl.startsWith("data:")) {
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // For signed URLs, open in new tab
        window.open(downloadUrl, "_blank")
      }
    }
  }

  return (
    <ToolResultCard
      icon={<Download className="size-4" />}
      title="Data Export"
      status={success ? "success" : "error"}
    >
      <div className="space-y-2">
        {success ? (
          <>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-4 text-green-500" />
              <span>
                Exported <strong>{recordCount}</strong> records to{" "}
                <code className="bg-muted px-1 rounded">{filename}</code>
              </span>
            </div>
            {downloadUrl && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleDownload}
              >
                <FileDown className="size-3" />
                Download
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-red-600">
            Export failed. Please try again.
          </p>
        )}
      </div>
    </ToolResultCard>
  )
}
