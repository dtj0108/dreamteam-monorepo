"use client"

import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useDemoData } from "@/providers"
import { DemoDashboardLayout } from "@/components/demo/demo-dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, TrendingUp, Wallet, CreditCard, ArrowRight, Calendar } from "lucide-react"

export default function DemoDashboardPage() {
  const { overview, transactions, accounts, budgets, subscriptions } = useDemoData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return formatDistanceToNow(date, { addSuffix: true })
    return format(date, 'MMM d')
  }

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checking: 'Checking',
      savings: 'Savings',
      credit_card: 'Credit Card',
      investment: 'Investment',
      loan: 'Loan',
      cash: 'Cash',
    }
    return labels[type] || type
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  // Get upcoming subscriptions (next 7 days)
  const upcomingSubscriptions = subscriptions
    .filter(sub => {
      const daysUntil = Math.ceil((new Date(sub.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil >= 0 && daysUntil <= 7
    })
    .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime())

  return (
    <DemoDashboardLayout breadcrumbs={[{ label: "Dashboard" }]}>
      {/* This Month Stats */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">This Month</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(overview.currentMonth.income)}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.changes.income !== 0 && (
                  <span className={overview.changes.income >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {overview.changes.income >= 0 ? (
                      <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                    )}
                    {formatChange(overview.changes.income)}
                  </span>
                )}{" "}
                {overview.changes.income !== 0 ? 'from last month' : 'this month'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                {formatCurrency(overview.currentMonth.expenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.changes.expenses !== 0 && (
                  <span className={overview.changes.expenses <= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {overview.changes.expenses <= 0 ? (
                      <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                    ) : (
                      <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                    )}
                    {formatChange(Math.abs(overview.changes.expenses))}
                  </span>
                )}{" "}
                {overview.changes.expenses !== 0 ? 'from last month' : 'this month'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overview.currentMonth.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(overview.currentMonth.profit)}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.changes.profit !== 0 && (
                  <span className={overview.changes.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {overview.changes.profit >= 0 ? (
                      <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                    )}
                    {formatChange(overview.changes.profit)}
                  </span>
                )}{" "}
                {overview.changes.profit !== 0 ? 'from last month' : 'this month'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All-Time Stats */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">All Time</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(overview.allTime.income)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <CreditCard className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                {formatCurrency(overview.allTime.expenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overview.allTime.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(overview.allTime.profit)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Recent Transactions */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            <Link href="/demo/transactions">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center ${
                        transaction.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {transaction.amount > 0 ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.categoryName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${transaction.amount > 0 ? 'text-emerald-600' : ''}`}>
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>This month&apos;s spending</CardDescription>
            </div>
            <Link href="/demo/budgets">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.slice(0, 5).map((budget) => {
                const spent = budget.spent || 0
                const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
                const isOverBudget = spent > budget.amount
                const categoryColor = budget.categories?.color || '#6b7280'

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{budget.name || budget.categories?.name || 'Budget'}</span>
                      <span className={isOverBudget ? 'text-rose-500' : 'text-muted-foreground'}>
                        {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : ''}`}
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: isOverBudget ? undefined : categoryColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card className="col-span-12 lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Renewals</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming renewals</p>
                <p className="text-xs text-muted-foreground">in the next 7 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSubscriptions.slice(0, 4).map((sub) => {
                  const daysUntil = Math.ceil((new Date(sub.next_billing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={sub.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(sub.amount)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Accounts</h2>
          <Link href="/demo/accounts">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {accounts.slice(0, 3).map((account) => (
            <Card key={account.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{account.name}</CardTitle>
                <CardDescription>
                  {getAccountTypeLabel(account.type)}
                  {account.institution && ` • ${account.institution}`}
                  {account.last_four && ` ••••${account.last_four}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${account.balance < 0 ? 'text-rose-600' : ''}`}>
                  {formatCurrency(account.balance)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoDashboardLayout>
  )
}

