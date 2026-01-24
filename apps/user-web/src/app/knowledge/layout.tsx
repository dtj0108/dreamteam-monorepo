"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductGate } from "@/components/product-gate"
import { KnowledgeProvider, useKnowledge } from "@/providers/knowledge-provider"
import { KnowledgeSidebar } from "@/components/knowledge/knowledge-sidebar"
import { CreatePageDialog } from "@/components/knowledge/create-page-dialog"
import { CreateWhiteboardDialog } from "@/components/knowledge/create-whiteboard-dialog"

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
    isLoading,
  } = useKnowledge()

  return (
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
