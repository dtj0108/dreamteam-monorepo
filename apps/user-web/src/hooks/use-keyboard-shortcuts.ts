import { useEffect } from "react"

export interface KeyboardShortcut {
  key: string
  meta?: boolean
  callback: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : true
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (metaMatch && keyMatch) {
          event.preventDefault()
          shortcut.callback()
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
