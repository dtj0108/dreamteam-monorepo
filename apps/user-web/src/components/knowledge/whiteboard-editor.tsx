"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPIType = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawComponentType = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MainMenuType = any

interface WhiteboardEditorProps {
  initialData?: unknown
  onChange?: (data: unknown) => void
  onThumbnailChange?: (thumbnail: string) => void
  readOnly?: boolean
}

export function WhiteboardEditor({
  initialData,
  onChange,
  onThumbnailChange,
  readOnly = false,
}: WhiteboardEditorProps) {
  const { resolvedTheme } = useTheme()
  const excalidrawRef = useRef<ExcalidrawAPIType | null>(null)
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<ExcalidrawComponentType | null>(null)
  const [MainMenu, setMainMenu] = useState<MainMenuType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastSaveRef = useRef<string>("")

  // Load Excalidraw dynamically on client-side only
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return

    let mounted = true

    async function loadExcalidraw() {
      try {
        // Dynamic import of Excalidraw
        const excalidrawModule = await import("@excalidraw/excalidraw")
        if (mounted) {
          setExcalidrawComponent(() => excalidrawModule.Excalidraw)
          setMainMenu(() => excalidrawModule.MainMenu)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Failed to load Excalidraw:", err)
        if (mounted) {
          setError(`Failed to load whiteboard editor: ${err instanceof Error ? err.message : "Unknown error"}`)
          setIsLoading(false)
        }
      }
    }

    loadExcalidraw()

    return () => {
      mounted = false
    }
  }, [])

  // Rebrand: Replace "Excalidraw" with "Whiteboard" in UI text
  useEffect(() => {
    if (!ExcalidrawComponent) return

    const rebrandText = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement
            if (parent?.tagName === 'SCRIPT' || parent?.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT
            }
            return node.textContent?.includes('Excalidraw')
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT
          }
        }
      )

      let node
      while ((node = walker.nextNode())) {
        if (node.textContent) {
          node.textContent = node.textContent.replace(/Excalidraw/g, 'Whiteboard')
        }
      }
    }

    // Only run rebrand after clicks (when menus might open)
    const handleClick = () => {
      // Small delay to let menu render
      setTimeout(rebrandText, 50)
      setTimeout(rebrandText, 150)
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('pointerdown', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [ExcalidrawComponent])

  // Debounced save handler
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: any, appState: any, files: any) => {
      if (!onChange) return

      // Create the scene data object
      const sceneData = {
        elements,
        appState: {
          // Only save relevant appState properties
          viewBackgroundColor: appState?.viewBackgroundColor,
          currentItemFontFamily: appState?.currentItemFontFamily,
          zoom: appState?.zoom,
          scrollX: appState?.scrollX,
          scrollY: appState?.scrollY,
        },
        files,
      }

      // Simple debounce by comparing JSON strings
      const sceneString = JSON.stringify(sceneData)
      if (sceneString === lastSaveRef.current) return
      lastSaveRef.current = sceneString

      onChange(sceneData)
    },
    [onChange]
  )

  // Parse initial data
  const getInitialData = useCallback(() => {
    if (!initialData || typeof initialData !== "object") {
      return null
    }

    const data = initialData as Record<string, unknown>
    const elements = Array.isArray(data.elements) ? data.elements : []

    // Only return data if there's actually content
    if (elements.length === 0 && !data.appState && !data.files) {
      return null
    }

    return {
      elements,
      appState: data.appState,
      files: data.files,
    }
  }, [initialData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading whiteboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-muted/30">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  if (!ExcalidrawComponent) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-muted/30">
        <div className="text-muted-foreground">Whiteboard not available</div>
      </div>
    )
  }

  return (
    <div style={{ height: "100%", width: "100%", minHeight: "400px" }}>
      <ExcalidrawComponent
        excalidrawAPI={(api: ExcalidrawAPIType) => {
          excalidrawRef.current = api
        }}
        initialData={getInitialData()}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        viewModeEnabled={readOnly}
        zenModeEnabled={false}
        gridModeEnabled={false}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true },
            toggleTheme: false,
            changeViewBackgroundColor: true,
          },
          tools: {
            image: true,
          },
          welcomeScreen: false,
        }}
        // Remove Excalidraw branding
        name="Whiteboard"
        renderTopRightUI={() => null}
        // Hide Excalidraw-specific sidebar
        renderSidebar={() => null}
      >
        {/* Custom MainMenu without Excalidraw links */}
        {MainMenu && (
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        )}
      </ExcalidrawComponent>
    </div>
  )
}
