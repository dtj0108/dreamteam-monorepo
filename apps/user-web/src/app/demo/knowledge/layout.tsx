"use client"

import { DemoKnowledgeLayout } from "@/components/demo/demo-knowledge-layout"

export default function DemoKnowledgeLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <DemoKnowledgeLayout>{children}</DemoKnowledgeLayout>
}
