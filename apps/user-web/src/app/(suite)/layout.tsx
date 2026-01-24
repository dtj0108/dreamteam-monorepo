import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { SuiteLayout } from "@/components/suite/suite-layout"

export default async function SuiteRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect("/login")
  }

  return <SuiteLayout user={session}>{children}</SuiteLayout>
}

