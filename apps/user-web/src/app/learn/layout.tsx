import { DashboardLayout } from "@/components/dashboard-layout"

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Learn" }]}>
      <div className="mx-auto w-full max-w-5xl pb-8">
        <main className="bg-background">
          {children}
        </main>
      </div>
    </DashboardLayout>
  )
}
