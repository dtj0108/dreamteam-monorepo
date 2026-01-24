"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductGate } from "@/components/product-gate"
import { ProjectsProvider } from "@/providers/projects-provider"

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProductGate product="projects">
      <DashboardLayout
        breadcrumbs={[{ label: "Projects", href: "/projects" }]}
      >
        <ProjectsProvider>
          {children}
        </ProjectsProvider>
      </DashboardLayout>
    </ProductGate>
  )
}

