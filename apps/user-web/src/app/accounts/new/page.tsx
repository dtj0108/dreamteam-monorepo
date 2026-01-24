import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountForm } from "@/components/accounts/account-form"

export default function NewAccountPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Accounts", href: "/accounts" },
        { label: "New Account" }
      ]}
    >
      <AccountForm />
    </DashboardLayout>
  )
}


