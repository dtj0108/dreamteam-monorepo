import { redirect } from "next/navigation"

// Redirect old configuration page to new configure page
export default async function OldAgentConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/agents/configure/${id}`)
}
