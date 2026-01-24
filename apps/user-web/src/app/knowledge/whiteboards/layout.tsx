// Import Excalidraw styles globally for all whiteboard pages
// Using the conditional export from package.json
import "@excalidraw/excalidraw/index.css"
// Custom overrides to rebrand Excalidraw as Whiteboard
import "./whiteboard-overrides.css"

export default function WhiteboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
