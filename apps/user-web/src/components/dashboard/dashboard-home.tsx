"use client"

import { useEffect, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useWorkspace } from "@/providers/workspace-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, TrendingUp, Wallet, CreditCard, Plus, ArrowRight } from "lucide-react"
import { UpcomingRenewals } from "@/components/subscriptions/upcoming-renewals"

interface OverviewData {
  currentMonth: { income: number; expenses: number; profit: number }
  lastMonth: { income: number; expenses: number; profit: number }
  allTime: { income: number; expenses: number; profit: number }
  changes: { income: number; expenses: number; profit: number }
  totalBalance: number
  accountCount: number
  trend: { month: string; label: string; income: number; expenses: number; profit: number }[]
}

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  accountName: string
  categoryName: string
  categoryColor: string
  type: string
}

interface Account {
  id: string
  name: string
  type: string
  institution: string | null
  balance: number
  currency: string
  last_four: string | null
}

interface AccountsData {
  accounts: Account[]
  totals: { assets: number; liabilities: number; netWorth: number }
}

interface BudgetData {
  id: string
  name: string
  amount: number
  spent: number
  category_id: string
  categories?: { name: string; color: string }
}

export function DashboardHome() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null)
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return

    const fetchData = async () => {
      try {
        const [overviewRes, transactionsRes, accountsRes, budgetsRes] = await Promise.all([
          fetch('/api/analytics/overview', { cache: 'no-store' }),
          fetch('/api/transactions/recent', { cache: 'no-store' }),
          fetch('/api/accounts', { cache: 'no-store' }),
          fetch('/api/budgets', { cache: 'no-store' }),
        ])

        if (overviewRes.ok) {
          const data = await overviewRes.json()
          setOverview(data)
        }

        if (transactionsRes.ok) {
          const data = await transactionsRes.json()
          setTransactions(data.transactions || [])
        }

        if (accountsRes.ok) {
          const data = await accountsRes.json()
          setAccountsData(data)
        }

        if (budgetsRes.ok) {
          const data = await budgetsRes.json()
          setBudgets(data.budgets || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [workspaceLoading, currentWorkspace?.id])

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

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]}>
      {/* This Month Stats */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">This Month</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(accountsData?.totals.netWorth || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {accountsData?.accounts.length || 0} account{(accountsData?.accounts.length || 0) !== 1 ? 's' : ''} connected
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
                    {formatCurrency(overview?.currentMonth.income || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.changes.income !== undefined && overview.changes.income !== 0 && (
                      <span className={overview.changes.income >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {overview.changes.income >= 0 ? (
                          <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                        )}
                        {formatChange(overview.changes.income)}
                      </span>
                    )}{" "}
                    {overview?.changes.income !== 0 ? 'from last month' : 'this month'}
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
                    {formatCurrency(overview?.currentMonth.expenses || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.changes.expenses !== undefined && overview.changes.expenses !== 0 && (
                      <span className={overview.changes.expenses <= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {overview.changes.expenses <= 0 ? (
                          <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                        )}
                        {formatChange(Math.abs(overview.changes.expenses))}
                      </span>
                    )}{" "}
                    {overview?.changes.expenses !== 0 ? 'from last month' : 'this month'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(overview?.currentMonth.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(overview?.currentMonth.profit || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.changes.profit !== undefined && overview.changes.profit !== 0 && (
                      <span className={overview.changes.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {overview.changes.profit >= 0 ? (
                          <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                        )}
                        {formatChange(overview.changes.profit)}
                      </span>
                    )}{" "}
                    {overview?.changes.profit !== 0 ? 'from last month' : 'this month'}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* All-Time Stats */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">All Time</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(overview?.allTime?.income || 0)}
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
                    {formatCurrency(overview?.allTime?.expenses || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(overview?.allTime?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(overview?.allTime?.profit || 0)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No transactions yet</p>
                <Link href="/transactions/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </Link>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>This month&apos;s spending</CardDescription>
            </div>
            <Link href="/budgets">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No budgets set</p>
                <Link href="/budgets">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Budget
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.slice(0, 5).map((budget) => {
                  const spent = budget.spent || 0
                  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
                  const isOverBudget = spent > budget.amount
                  const categoryColor = (budget.categories as { color?: string })?.color || '#6b7280'

                  return (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{budget.name || (budget.categories as { name?: string })?.name || 'Budget'}</span>
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
            )}
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <div className="col-span-12 lg:col-span-3">
          <UpcomingRenewals 
            daysAhead={7} 
            maxItems={4} 
            title="Upcoming Renewals"
            compact
          />
        </div>
      </div>

      {/* Accounts Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Accounts</h2>
          <Link href="/accounts">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !accountsData?.accounts.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No accounts added yet</p>
              <Link href="/accounts/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {accountsData.accounts.slice(0, 3).map((account) => (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

