"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useWorkspace } from "@/providers/workspace-provider"
import { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MetricCard, ChartContainer, BarChart } from "@/components/charts"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Download, FileSpreadsheet, Play, Filter, DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react"
// Using API routes instead of direct database queries for proper workspace filtering
import type { Account, Category } from "@/lib/types"

interface ReportData {
  period: { startDate: string; endDate: string }
  summary: {
    totalIncome: number
    totalExpenses: number
    netAmount: number
    transactionCount: number
  }
  groupedData: {
    key: string
    label: string
    income: number
    expenses: number
    net: number
    count: number
  }[]
  transactions: {
    id: string
    date: string
    description: string
    amount: number
    accountName: string
    categoryName: string
    categoryColor: string
    type: string
  }[]
}

export default function CustomReportPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [transactionType, setTransactionType] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<string>("category")
  const [includeTransactions, setIncludeTransactions] = useState(true)

  useEffect(() => {
    // Wait for workspace to be loaded before fetching
    if (workspaceLoading) return

    const loadFilters = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          fetch('/api/accounts', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])

        if (accountsRes.ok) {
          const data = await accountsRes.json()
          setAccounts(data.accounts || [])
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Failed to load filters:", error)
      }
    }
    loadFilters()
  }, [workspaceLoading, currentWorkspace?.id])

  const generateReport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
          accounts: selectedAccounts.length > 0 ? selectedAccounts : undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          transactionType: transactionType !== "all" ? transactionType : undefined,
          groupBy,
          includeTransactions,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate report")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to generate report:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const exportToCSV = () => {
    if (!data) return

    const rows = [
      ["Custom Report"],
      [`Period: ${data.period.startDate} to ${data.period.endDate}`],
      [],
      ["Summary"],
      ["Total Income", data.summary.totalIncome.toString()],
      ["Total Expenses", data.summary.totalExpenses.toString()],
      ["Net Amount", data.summary.netAmount.toString()],
      ["Transaction Count", data.summary.transactionCount.toString()],
      [],
    ]

    if (data.groupedData.length > 0) {
      rows.push(["GROUPED DATA"])
      rows.push(["Group", "Income", "Expenses", "Net", "Count"])
      data.groupedData.forEach(g => {
        rows.push([g.label, g.income.toString(), g.expenses.toString(), g.net.toString(), g.count.toString()])
      })
      rows.push([])
    }

    if (data.transactions.length > 0) {
      rows.push(["TRANSACTIONS"])
      rows.push(["Date", "Description", "Account", "Category", "Amount", "Type"])
      data.transactions.forEach(t => {
        rows.push([t.date, t.description, t.accountName, t.categoryName, t.amount.toString(), t.type])
      })
    }

    const csv = rows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `custom-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: "Custom Report" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custom Report Builder</h1>
            <p className="text-muted-foreground">
              Create custom reports with filters and grouping options
            </p>
          </div>
          {data && (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
            <CardDescription>
              Configure your report parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="expense">Expenses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group By */}
              <div className="space-y-2">
                <Label>Group By</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accounts Filter */}
              <div className="space-y-2">
                <Label>Accounts ({selectedAccounts.length || "All"})</Label>
                <ScrollArea className="h-24 border rounded-md p-2">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`acc-${acc.id}`}
                        checked={selectedAccounts.includes(acc.id)}
                        onCheckedChange={() => toggleAccount(acc.id)}
                      />
                      <label htmlFor={`acc-${acc.id}`} className="text-sm cursor-pointer">
                        {acc.name}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Categories Filter */}
              <div className="space-y-2">
                <Label>Categories ({selectedCategories.length || "All"})</Label>
                <ScrollArea className="h-24 border rounded-md p-2">
                  {categories.filter(c => !c.is_system).map(cat => (
                    <div key={cat.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={selectedCategories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            {/* Include Transactions */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-transactions"
                checked={includeTransactions}
                onCheckedChange={(checked) => setIncludeTransactions(!!checked)}
              />
              <label htmlFor="include-transactions" className="text-sm cursor-pointer">
                Include individual transactions in report
              </label>
            </div>

            {/* Generate Button */}
            <Button onClick={generateReport} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                "Generating..."
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
            <Skeleton className="h-[300px]" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Income"
                value={data.summary.totalIncome}
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                valueClassName="text-emerald-600"
              />
              <MetricCard
                title="Total Expenses"
                value={data.summary.totalExpenses}
                icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                valueClassName="text-rose-600"
              />
              <MetricCard
                title="Net Amount"
                value={data.summary.netAmount}
                icon={<DollarSign className="h-4 w-4 text-primary" />}
                valueClassName={data.summary.netAmount >= 0 ? "text-emerald-600" : "text-rose-600"}
              />
              <MetricCard
                title="Transactions"
                value={data.summary.transactionCount}
                icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            {/* Grouped Data Chart */}
            {data.groupedData.length > 0 && (
              <ChartContainer title={`Data Grouped by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}>
                <BarChart
                  data={data.groupedData.map(g => ({
                    name: g.label.length > 15 ? g.label.slice(0, 15) + "..." : g.label,
                    income: g.income,
                    expenses: g.expenses,
                  }))}
                  xKey="name"
                  bars={[
                    { dataKey: "income", name: "Income", color: "#10b981" },
                    { dataKey: "expenses", name: "Expenses", color: "#ef4444" },
                  ]}
                  height={300}
                  showLegend
                />
              </ChartContainer>
            )}

            {/* Grouped Data Table */}
            {data.groupedData.length > 0 && (
              <ChartContainer title="Grouped Summary">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.groupedData.map(row => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {formatCurrency(row.income)}
                        </TableCell>
                        <TableCell className="text-right text-rose-600">
                          {formatCurrency(row.expenses)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${row.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatCurrency(row.net)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ChartContainer>
            )}

            {/* Transactions List */}
            {data.transactions.length > 0 && (
              <ChartContainer title={`Transactions (${data.transactions.length})`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.slice(0, 100).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.accountName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${tx.categoryColor}20`,
                              color: tx.categoryColor,
                            }}
                          >
                            {tx.categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.transactions.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Showing first 100 of {data.transactions.length} transactions. Export to CSV for full list.
                  </p>
                )}
              </ChartContainer>
            )}
          </>
        ) : (
          <Card className="py-12">
            <div className="text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium mb-2">Configure your report</p>
              <p className="text-sm">Set filters and click Generate Report to see results</p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

