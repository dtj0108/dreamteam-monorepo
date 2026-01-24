"use client"

import { useState, useCallback, useMemo } from "react"
import { AutocompleteType, AutocompleteItem, slashCommands } from "@/components/team/autocomplete-popup"

interface AutocompleteState {
  isOpen: boolean
  type: AutocompleteType | null
  query: string
  triggerPosition: number
  selectedIndex: number
}

interface UseAutocompleteOptions {
  members?: AutocompleteItem[]
  channels?: AutocompleteItem[]
}

export function useAutocomplete(options: UseAutocompleteOptions = {}) {
  const { members = [], channels = [] } = options

  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    type: null,
    query: "",
    triggerPosition: 0,
    selectedIndex: 0,
  })

  // Filter items based on current query
  const filteredItems = useMemo(() => {
    if (!state.type) return []

    const query = state.query.toLowerCase()

    switch (state.type) {
      case "mention":
        return members.filter(m =>
          m.label.toLowerCase().includes(query)
        ).slice(0, 10)

      case "channel":
        return channels.filter(c =>
          c.label.toLowerCase().includes(query)
        ).slice(0, 10)

      case "command":
        return slashCommands.filter(c =>
          c.label.toLowerCase().includes(query) ||
          c.sublabel?.toLowerCase().includes(query)
        ).slice(0, 10)

      default:
        return []
    }
  }, [state.type, state.query, members, channels])

  // Detect trigger characters in text
  const detectTrigger = useCallback((text: string, cursorPos: number): AutocompleteState | null => {
    const beforeCursor = text.slice(0, cursorPos)

    // Check for @mention - matches @word at end
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      return {
        isOpen: true,
        type: "mention",
        query: mentionMatch[1],
        triggerPosition: cursorPos - mentionMatch[0].length,
        selectedIndex: 0,
      }
    }

    // Check for #channel - matches #word at end
    const channelMatch = beforeCursor.match(/#([\w-]*)$/)
    if (channelMatch) {
      return {
        isOpen: true,
        type: "channel",
        query: channelMatch[1],
        triggerPosition: cursorPos - channelMatch[0].length,
        selectedIndex: 0,
      }
    }

    // Check for /command - only at start of message or after newline
    const commandMatch = beforeCursor.match(/^\/(\w*)$|(?:\n)\/(\w*)$/)
    if (commandMatch) {
      const query = commandMatch[1] || commandMatch[2] || ""
      return {
        isOpen: true,
        type: "command",
        query,
        triggerPosition: cursorPos - query.length - 1,
        selectedIndex: 0,
      }
    }

    return null
  }, [])

  // Update autocomplete state when text changes
  const handleTextChange = useCallback((text: string, cursorPos: number) => {
    const newState = detectTrigger(text, cursorPos)

    if (newState) {
      setState(prev => ({
        ...newState,
        // Preserve selected index if type and query prefix match
        selectedIndex: prev.type === newState.type && newState.query.startsWith(prev.query.slice(0, -1))
          ? Math.min(prev.selectedIndex, 9)
          : 0,
      }))
    } else {
      close()
    }
  }, [detectTrigger])

  // Close autocomplete
  const close = useCallback(() => {
    setState({
      isOpen: false,
      type: null,
      query: "",
      triggerPosition: 0,
      selectedIndex: 0,
    })
  }, [])

  // Navigate selection
  const navigateUp = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.max(0, prev.selectedIndex - 1),
    }))
  }, [])

  const navigateDown = useCallback((maxIndex: number) => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.min(maxIndex, prev.selectedIndex + 1),
    }))
  }, [])

  // Get the text to insert when an item is selected
  const getInsertText = useCallback((item: AutocompleteItem): string => {
    switch (state.type) {
      case "mention":
        return `@${item.label} `
      case "channel":
        return `#${item.label} `
      case "command":
        // Handle special commands
        if (item.id === "shrug") {
          return "¯\\_(ツ)_/¯"
        }
        if (item.id === "code") {
          return "```\n\n```"
        }
        return `/${item.id} `
      default:
        return item.label
    }
  }, [state.type])

  return {
    ...state,
    filteredItems,
    handleTextChange,
    close,
    navigateUp,
    navigateDown,
    getInsertText,
  }
}
