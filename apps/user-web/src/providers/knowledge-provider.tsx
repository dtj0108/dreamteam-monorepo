"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"

export interface KnowledgeCategory {
  id: string
  workspaceId: string
  name: string
  slug: string
  color: string | null
  icon: string | null
  isSystem: boolean
  position: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  pageCount?: number
}

export interface KnowledgePage {
  id: string
  workspaceId: string
  parentId: string | null
  title: string
  icon: string | null
  coverImage: string | null
  content: unknown
  isTemplate: boolean
  templateId: string | null
  isArchived: boolean
  isFavorite: boolean
  position: number
  createdBy: string | null
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
  categoryIds: string[]
  categories: KnowledgeCategory[]
}

export interface KnowledgeTemplate {
  id: string
  workspaceId: string | null
  name: string
  description: string | null
  icon: string | null
  category: string | null
  content: unknown
  isSystem: boolean
  usageCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Whiteboard {
  id: string
  workspaceId: string
  title: string
  icon: string
  content: unknown // Excalidraw scene data
  thumbnail: string | null
  isArchived: boolean
  isFavorite: boolean
  position: number
  createdBy: string | null
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
}

interface CreatePageInput {
  title?: string
  parentId?: string
  templateId?: string
  icon?: string
  content?: unknown
}

interface UpdatePageInput {
  title?: string
  icon?: string
  coverImage?: string
  content?: unknown
  parentId?: string
  position?: number
  isArchived?: boolean
}

interface CreateCategoryInput {
  name: string
  color?: string
  icon?: string
}

interface CreateWhiteboardInput {
  title?: string
  icon?: string
}

interface UpdateWhiteboardInput {
  title?: string
  icon?: string
  content?: unknown
  thumbnail?: string
  position?: number
  isArchived?: boolean
}

interface KnowledgeContextType {
  // State
  pages: KnowledgePage[]
  favorites: KnowledgePage[]
  templates: KnowledgeTemplate[]
  categories: KnowledgeCategory[]
  whiteboards: Whiteboard[]
  favoriteWhiteboards: Whiteboard[]
  isLoading: boolean
  workspaceId: string | undefined

  // Category filtering
  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void
  filteredPages: KnowledgePage[]

  // Lookup helpers
  getPageById: (id: string) => KnowledgePage | undefined
  getChildPages: (parentId: string | null) => KnowledgePage[]
  getCategoryById: (id: string) => KnowledgeCategory | undefined
  getPagesByCategory: (categoryId: string) => KnowledgePage[]
  getWhiteboardById: (id: string) => Whiteboard | undefined

  // Actions
  createPage: (input: CreatePageInput) => Promise<KnowledgePage | null>
  updatePage: (id: string, updates: UpdatePageInput) => Promise<void>
  deletePage: (id: string, permanent?: boolean) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  refreshPages: () => Promise<void>

  // Category actions
  createCategory: (input: CreateCategoryInput) => Promise<KnowledgeCategory | null>
  deleteCategory: (id: string) => Promise<void>
  setPageCategories: (pageId: string, categoryIds: string[]) => Promise<void>
  refreshCategories: () => Promise<void>

  // Whiteboard actions
  createWhiteboard: (input: CreateWhiteboardInput) => Promise<Whiteboard | null>
  updateWhiteboard: (id: string, updates: UpdateWhiteboardInput) => Promise<void>
  deleteWhiteboard: (id: string, permanent?: boolean) => Promise<void>
  toggleWhiteboardFavorite: (id: string) => Promise<void>
  refreshWhiteboards: () => Promise<void>

  // Dialog state
  showCreatePage: boolean
  setShowCreatePage: (show: boolean) => void
  showCreateWhiteboard: boolean
  setShowCreateWhiteboard: (show: boolean) => void
}

const KnowledgeContext = createContext<KnowledgeContextType | null>(null)

export function useKnowledge() {
  const context = useContext(KnowledgeContext)
  if (!context) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider")
  }
  return context
}

// Transform API response to camelCase
function transformPage(page: Record<string, unknown>): KnowledgePage {
  return {
    id: page.id as string,
    workspaceId: page.workspace_id as string,
    parentId: page.parent_id as string | null,
    title: page.title as string,
    icon: page.icon as string | null,
    coverImage: page.cover_image as string | null,
    content: page.content,
    isTemplate: page.is_template as boolean,
    templateId: page.template_id as string | null,
    isArchived: page.is_archived as boolean,
    isFavorite: page.isFavorite as boolean,
    position: page.position as number,
    createdBy: page.created_by as string | null,
    lastEditedBy: page.last_edited_by as string | null,
    createdAt: page.created_at as string,
    updatedAt: page.updated_at as string,
    categoryIds: (page.categoryIds as string[]) || [],
    categories: (page.categories as KnowledgeCategory[]) || [],
  }
}

function transformTemplate(template: Record<string, unknown>): KnowledgeTemplate {
  return {
    id: template.id as string,
    workspaceId: template.workspace_id as string | null,
    name: template.name as string,
    description: template.description as string | null,
    icon: template.icon as string | null,
    category: template.category as string | null,
    content: template.content,
    isSystem: template.is_system as boolean,
    usageCount: template.usage_count as number,
    createdBy: template.created_by as string | null,
    createdAt: template.created_at as string,
    updatedAt: template.updated_at as string,
  }
}

function transformWhiteboard(wb: Record<string, unknown>): Whiteboard {
  return {
    id: wb.id as string,
    workspaceId: wb.workspace_id as string,
    title: wb.title as string,
    icon: (wb.icon as string) || "🎨",
    content: wb.content,
    thumbnail: wb.thumbnail as string | null,
    isArchived: wb.is_archived as boolean,
    isFavorite: wb.isFavorite as boolean,
    position: wb.position as number,
    createdBy: wb.created_by as string | null,
    lastEditedBy: wb.last_edited_by as string | null,
    createdAt: wb.created_at as string,
    updatedAt: wb.updated_at as string,
  }
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const router = useRouter()
  const workspaceId = user?.workspaceId || undefined

  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [templates, setTemplates] = useState<KnowledgeTemplate[]>([])
  const [categories, setCategories] = useState<KnowledgeCategory[]>([])
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreatePage, setShowCreatePage] = useState(false)
  const [showCreateWhiteboard, setShowCreateWhiteboard] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Track which workspace we've fetched for
  const fetchedWorkspaceRef = useRef<string | null>(null)

  // Compute favorites from pages
  const favorites = pages.filter(p => p.isFavorite)

  // Compute favorite whiteboards
  const favoriteWhiteboards = whiteboards.filter(wb => wb.isFavorite)

  // Compute filtered pages based on selected category
  const filteredPages = selectedCategoryId
    ? pages.filter(p => p.categoryIds.includes(selectedCategoryId))
    : pages

  // Lookup helpers
  const getPageById = useCallback((id: string) => {
    return pages.find(p => p.id === id)
  }, [pages])

  const getChildPages = useCallback((parentId: string | null) => {
    return pages.filter(p => p.parentId === parentId)
  }, [pages])

  const getCategoryById = useCallback((id: string) => {
    return categories.find(c => c.id === id)
  }, [categories])

  const getPagesByCategory = useCallback((categoryId: string) => {
    return pages.filter(p => p.categoryIds.includes(categoryId))
  }, [pages])

  const getWhiteboardById = useCallback((id: string) => {
    return whiteboards.find(wb => wb.id === id)
  }, [whiteboards])

  // Fetch pages
  const fetchPages = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/knowledge/pages?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setPages(data.map(transformPage))
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/knowledge/templates?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setTemplates(data.map(transformTemplate))
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    }
  }, [workspaceId])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/knowledge/categories?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setCategories(data)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }, [workspaceId])

  // Fetch whiteboards
  const fetchWhiteboards = useCallback(async () => {
    if (!workspaceId) return

    try {
      const response = await fetch(`/api/knowledge/whiteboards?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setWhiteboards(data.map(transformWhiteboard))
      }
    } catch (error) {
      console.error("Failed to fetch whiteboards:", error)
    }
  }, [workspaceId])

  // Initial fetch
  useEffect(() => {
    if (workspaceId && fetchedWorkspaceRef.current !== workspaceId) {
      fetchedWorkspaceRef.current = workspaceId
      setIsLoading(true)
      fetchPages()
      fetchTemplates()
      fetchCategories()
      fetchWhiteboards()
    }
  }, [workspaceId, fetchPages, fetchTemplates, fetchCategories, fetchWhiteboards])

  // Create page
  const createPage = async (input: CreatePageInput): Promise<KnowledgePage | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch("/api/knowledge/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          ...input,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create page")
      }

      const newPage = transformPage(data)

      // Add to local state
      setPages(prev => [...prev, newPage])

      // Close dialog
      setShowCreatePage(false)

      return newPage
    } catch (error) {
      console.error("Failed to create page:", error)
      return null
    }
  }

  // Update page
  const updatePage = async (id: string, updates: UpdatePageInput): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update page")
      }

      const updatedPage = transformPage(data)

      // Update local state
      setPages(prev => prev.map(p => p.id === id ? updatedPage : p))
    } catch (error) {
      console.error("Failed to update page:", error)
      throw error
    }
  }

  // Delete page
  const deletePage = async (id: string, permanent = false): Promise<void> => {
    try {
      const url = permanent
        ? `/api/knowledge/pages/${id}?permanent=true`
        : `/api/knowledge/pages/${id}`

      const response = await fetch(url, { method: "DELETE" })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete page")
      }

      // Remove from local state (or mark as archived)
      if (permanent) {
        setPages(prev => prev.filter(p => p.id !== id))
      } else {
        setPages(prev => prev.map(p =>
          p.id === id ? { ...p, isArchived: true } : p
        ))
      }
    } catch (error) {
      console.error("Failed to delete page:", error)
      throw error
    }
  }

  // Toggle favorite
  const toggleFavorite = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/pages/${id}/favorite`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle favorite")
      }

      // Update local state
      setPages(prev => prev.map(p =>
        p.id === id ? { ...p, isFavorite: data.isFavorite } : p
      ))
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
      throw error
    }
  }

  // Create category
  const createCategory = async (input: CreateCategoryInput): Promise<KnowledgeCategory | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch("/api/knowledge/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          ...input,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category")
      }

      // Add to local state
      setCategories(prev => [...prev, data])

      return data
    } catch (error) {
      console.error("Failed to create category:", error)
      return null
    }
  }

  // Delete category
  const deleteCategory = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/categories/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete category")
      }

      // Remove from local state
      setCategories(prev => prev.filter(c => c.id !== id))

      // Clear selection if the deleted category was selected
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null)
      }

      // Update pages to remove this category
      setPages(prev => prev.map(p => ({
        ...p,
        categoryIds: p.categoryIds.filter(cid => cid !== id),
        categories: p.categories.filter(c => c.id !== id),
      })))
    } catch (error) {
      console.error("Failed to delete category:", error)
      throw error
    }
  }

  // Set page categories
  const setPageCategories = async (pageId: string, categoryIds: string[]): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/pages/${pageId}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update page categories")
      }

      // Update local state
      setPages(prev => prev.map(p => {
        if (p.id === pageId) {
          return {
            ...p,
            categoryIds,
            categories: data,
          }
        }
        return p
      }))

      // Refresh categories to update page counts
      fetchCategories()
    } catch (error) {
      console.error("Failed to set page categories:", error)
      throw error
    }
  }

  // Create whiteboard
  const createWhiteboard = async (input: CreateWhiteboardInput): Promise<Whiteboard | null> => {
    if (!workspaceId) return null

    try {
      const response = await fetch("/api/knowledge/whiteboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          ...input,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create whiteboard")
      }

      const newWhiteboard = transformWhiteboard(data)

      // Add to local state
      setWhiteboards(prev => [...prev, newWhiteboard])

      // Close dialog
      setShowCreateWhiteboard(false)

      return newWhiteboard
    } catch (error) {
      console.error("Failed to create whiteboard:", error)
      return null
    }
  }

  // Update whiteboard
  const updateWhiteboard = async (id: string, updates: UpdateWhiteboardInput): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/whiteboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update whiteboard")
      }

      const updatedWhiteboard = transformWhiteboard(data)

      // Update local state
      setWhiteboards(prev => prev.map(wb => wb.id === id ? updatedWhiteboard : wb))
    } catch (error) {
      console.error("Failed to update whiteboard:", error)
      throw error
    }
  }

  // Delete whiteboard
  const deleteWhiteboard = async (id: string, permanent = false): Promise<void> => {
    try {
      const url = permanent
        ? `/api/knowledge/whiteboards/${id}?permanent=true`
        : `/api/knowledge/whiteboards/${id}`

      const response = await fetch(url, { method: "DELETE" })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete whiteboard")
      }

      // Remove from local state (or mark as archived)
      if (permanent) {
        setWhiteboards(prev => prev.filter(wb => wb.id !== id))
      } else {
        setWhiteboards(prev => prev.map(wb =>
          wb.id === id ? { ...wb, isArchived: true } : wb
        ))
      }
    } catch (error) {
      console.error("Failed to delete whiteboard:", error)
      throw error
    }
  }

  // Toggle whiteboard favorite
  const toggleWhiteboardFavorite = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/knowledge/whiteboards/${id}/favorite`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle whiteboard favorite")
      }

      // Update local state
      setWhiteboards(prev => prev.map(wb =>
        wb.id === id ? { ...wb, isFavorite: data.isFavorite } : wb
      ))
    } catch (error) {
      console.error("Failed to toggle whiteboard favorite:", error)
      throw error
    }
  }

  const value: KnowledgeContextType = {
    pages: pages.filter(p => !p.isArchived),
    favorites,
    templates,
    categories,
    whiteboards: whiteboards.filter(wb => !wb.isArchived),
    favoriteWhiteboards,
    isLoading,
    workspaceId,
    selectedCategoryId,
    setSelectedCategoryId,
    filteredPages: filteredPages.filter(p => !p.isArchived),
    getPageById,
    getChildPages,
    getCategoryById,
    getPagesByCategory,
    getWhiteboardById,
    createPage,
    updatePage,
    deletePage,
    toggleFavorite,
    refreshPages: fetchPages,
    createCategory,
    deleteCategory,
    setPageCategories,
    refreshCategories: fetchCategories,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    toggleWhiteboardFavorite,
    refreshWhiteboards: fetchWhiteboards,
    showCreatePage,
    setShowCreatePage,
    showCreateWhiteboard,
    setShowCreateWhiteboard,
  }

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  )
}
