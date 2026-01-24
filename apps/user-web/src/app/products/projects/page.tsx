import type { Metadata } from "next"
import { ProjectsContent } from "./projects-content"

export const metadata: Metadata = {
  title: "Projects",
  description: "Project management with AI. Track tasks, milestones, and team workload effortlessly.",
  openGraph: {
    title: "Projects | dreamteam.ai",
    description: "Project management with AI. Track tasks, milestones, and team workload effortlessly.",
    url: "https://dreamteam.ai/products/projects",
    images: ["/api/og?title=Projects&description=Work%20that%20tracks%20itself&type=product"],
  },
  twitter: {
    title: "Projects | dreamteam.ai",
    description: "Project management with AI. Track tasks, milestones, and team workload effortlessly.",
    images: ["/api/og?title=Projects&description=Work%20that%20tracks%20itself&type=product"],
  },
}

export default function ProjectsProductPage() {
  return <ProjectsContent />
}
