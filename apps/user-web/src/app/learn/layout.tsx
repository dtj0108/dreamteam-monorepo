import { DashboardLayout } from "@/components/dashboard-layout"
import { LearnSidebar } from "@/components/learn"

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Learn" }]}>
      <div className="flex min-h-[calc(100vh-5rem)] -mx-4 -mb-4 -mt-4">
        <LearnSidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <div className="max-w-3xl">
            {children}
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}

