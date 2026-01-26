import { redirect } from "next/navigation"

// Redirect old configurations list page to hired agents page
export default function OldConfigurationsPage() {
  redirect("/agents/hired")
}
