"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductGate } from "@/components/product-gate"
import { KnowledgeProvider, useKnowledge, type KnowledgePage } from "@/providers/knowledge-provider"
import { KnowledgeSidebar } from "@/components/knowledge/knowledge-sidebar"
import { CreatePageDialog } from "@/components/knowledge/create-page-dialog"
import { CreateWhiteboardDialog } from "@/components/knowledge/create-whiteboard-dialog"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { FileText } from "lucide-react"

function KnowledgeLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    pages,
    favorites,
    templates,
    categories,
    whiteboards,
    selectedCategoryId,
    setSelectedCategoryId,
    createCategory,
    showCreatePage,
    setShowCreatePage,
    createPage,
    showCreateWhiteboard,
    setShowCreateWhiteboard,
    createWhiteboard,
    setPageCategories,
    isLoading,
  } = useKnowledge()

  const [activeDragPage, setActiveDragPage] = useState<KnowledgePage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current
    if (dragData?.type === "page") {
      setActiveDragPage(dragData.page as KnowledgePage)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragPage(null)

    if (!over) return

    const dragData = active.data.current
    const dropData = over.data.current

    if (dragData?.type === "page" && dropData?.type === "category") {
      const page = dragData.page as KnowledgePage
      const categoryId = dropData.categoryId as string

      // Add the category to page's existing categories (if not already present)
      const currentCategoryIds = page.categoryIds || []
      if (!currentCategoryIds.includes(categoryId)) {
        const newCategoryIds = [...currentCategoryIds, categoryId]
        await setPageCategories(page.id, newCategoryIds)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 min-h-0">
        {/* Knowledge Sidebar - page tree */}
        <KnowledgeSidebar
          pages={pages}
          favorites={favorites}
          categories={categories}
          whiteboards={whiteboards}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCreateCategory={(name, color) => createCategory({ name, color })}
          onCreatePage={() => setShowCreatePage(true)}
          onCreateWhiteboard={() => setShowCreateWhiteboard(true)}
          isLoading={isLoading}
        />

        {/* Main Content Area */}
        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden pl-4"
          style={{ viewTransitionName: "knowledge-content" }}
        >
          {children}
        </div>

        {/* Create Page Dialog */}
        <CreatePageDialog
          open={showCreatePage}
          onOpenChange={setShowCreatePage}
          templates={templates}
          onCreatePage={createPage}
          onSwitchToWhiteboard={() => {
            setShowCreatePage(false)
            setShowCreateWhiteboard(true)
          }}
        />

        {/* Create Whiteboard Dialog */}
        <CreateWhiteboardDialog
          open={showCreateWhiteboard}
          onOpenChange={setShowCreateWhiteboard}
          onCreateWhiteboard={createWhiteboard}
        />
      </div>

      {/* Drag Overlay - shows preview of dragged page */}
      <DragOverlay>
        {activeDragPage && (
          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
            <span className="text-lg">{activeDragPage.icon || <FileText className="size-4" />}</span>
            <span className="text-sm font-medium truncate max-w-48">
              {activeDragPage.title || "Untitled"}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProductGate product="knowledge">
      <DashboardLayout
        breadcrumbs={[{ label: "Knowledge", href: "/knowledge" }]}
        noPadding
        defaultCollapsed
      >
        <KnowledgeProvider>
          <KnowledgeLayoutContent>{children}</KnowledgeLayoutContent>
        </KnowledgeProvider>
      </DashboardLayout>
    </ProductGate>
  )
}
