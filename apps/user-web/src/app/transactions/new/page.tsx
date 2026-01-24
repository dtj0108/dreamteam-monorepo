import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewTransactionPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Transactions", href: "/transactions" },
        { label: "New Transaction" }
      ]}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
          <CardDescription>
            Record a new transaction to track your spending or income.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}


