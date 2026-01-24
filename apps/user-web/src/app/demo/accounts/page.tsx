"use client"

import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CreditCard, PiggyBank, Wallet } from "lucide-react"

export default function DemoAccountsPage() {
  const { accounts, transactions } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return Building2
      case 'savings':
        return PiggyBank
      case 'credit_card':
        return CreditCard
      default:
        return Wallet
    }
  }

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checking: 'Checking Account',
      savings: 'Savings Account',
      credit_card: 'Credit Card',
      investment: 'Investment Account',
      loan: 'Loan',
      cash: 'Cash',
    }
    return labels[type] || type
  }

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0)
  const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0))
  const netWorth = totalAssets - totalLiabilities

  // Get recent transactions per account
  const getRecentForAccount = (accountId: string) => {
    return transactions.filter(tx => tx.account_id === accountId).slice(0, 3)
  }

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Accounts" }]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAssets)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalLiabilities)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(netWorth)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.type)
            const recentTx = getRecentForAccount(account.id)

            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        account.balance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription>
                          {getAccountTypeLabel(account.type)}
                          {account.last_four && ` • ••••${account.last_four}`}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className={`text-2xl font-bold ${account.balance < 0 ? 'text-rose-600' : ''}`}>
                      {formatCurrency(account.balance)}
                    </p>
                    {account.institution && (
                      <p className="text-xs text-muted-foreground mt-1">{account.institution}</p>
                    )}
                  </div>

                  {recentTx.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
                      <div className="space-y-2">
                        {recentTx.map((tx) => (
                          <div key={tx.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground truncate max-w-[150px]">{tx.description}</span>
                            <span className={tx.amount > 0 ? 'text-emerald-600' : ''}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </DemoDashboardLayout>
  )
}

