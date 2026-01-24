"use client"

import { useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type MessageAttachment } from "@/types/files"

interface ImageLightboxProps {
  images: MessageAttachment[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  onIndexChange?: (index: number) => void
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const currentIndex = initialIndex
  const currentImage = images[currentIndex]
  const hasMultiple = images.length > 1

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onIndexChange?.(currentIndex + 1)
    }
  }, [currentIndex, images.length, onIndexChange])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange?.(currentIndex - 1)
    }
  }, [currentIndex, onIndexChange])

  const handleDownload = () => {
    if (currentImage) {
      window.open(currentImage.fileUrl, "_blank")
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          goToPrevious()
          break
        case "ArrowRight":
          goToNext()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, goToPrevious, goToNext])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen || !currentImage) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative z-10 max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="text-white">
            <p className="font-medium truncate max-w-md">{currentImage.fileName}</p>
            {hasMultiple && (
              <p className="text-sm text-white/60">
                {currentIndex + 1} of {images.length}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleDownload}
            >
              <Download className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div className="flex-1 flex items-center justify-center px-16 pb-4">
          <img
            src={currentImage.fileUrl}
            alt={currentImage.fileName}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        </div>

        {/* Navigation buttons */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 size-12 rounded-full",
                "text-white hover:bg-white/10",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="size-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-full",
                "text-white hover:bg-white/10",
                currentIndex === images.length - 1 && "opacity-50 cursor-not-allowed"
              )}
              onClick={goToNext}
              disabled={currentIndex === images.length - 1}
            >
              <ChevronRight className="size-8" />
            </Button>
          </>
        )}

        {/* Thumbnail strip for multiple images */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-2 px-4 pb-4 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={cn(
                  "size-16 rounded-md overflow-hidden border-2 transition-all shrink-0",
                  index === currentIndex
                    ? "border-white opacity-100"
                    : "border-transparent opacity-50 hover:opacity-75"
                )}
                onClick={() => onIndexChange?.(index)}
              >
                <img
                  src={image.fileUrl}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
