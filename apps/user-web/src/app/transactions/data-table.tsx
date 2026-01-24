"use client"

import * as React from "react"
import { format, subDays, subMonths, startOfMonth, startOfYear } from "date-fns"
import { CalendarIcon, X, Search, Plus, Upload, HelpCircle, Filter, Tag, DollarSign, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"
import { BulkActionBar } from "@/components/transactions/bulk-action-bar"
import { CategoryPickerDialog } from "@/components/transactions/category-picker-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { TransactionWithCategory, Account, Category } from "@/lib/types"

interface TransactionDataTableProps {
  columns: ColumnDef<TransactionWithCategory, unknown>[]
  data: TransactionWithCategory[]
  accounts: Account[]
  categories: Category[]
  onAccountChange: (accountId: string) => void
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
  onAddTransaction: () => void
  selectedAccount: string
  dateRange: { from?: Date; to?: Date }
  onBulkAICategorize: (transactions: TransactionWithCategory[]) => Promise<void>
  onBulkSetCategory: (transactionIds: string[], categoryId: string | null) => Promise<void>
  onBulkDelete: (transactionIds: string[]) => Promise<void>
}

export function TransactionDataTable({
  columns,
  data,
  accounts,
  categories,
  onAccountChange,
  onDateRangeChange,
  onAddTransaction,
  selectedAccount,
  dateRange,
  onBulkAICategorize,
  onBulkSetCategory,
  onBulkDelete,
}: TransactionDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [categoryPickerOpen, setCategoryPickerOpen] = React.useState(false)
  const [categoryLoading, setCategoryLoading] = React.useState(false)
  
  // Additional filter state (applied filters)
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [transactionType, setTransactionType] = React.useState<"all" | "income" | "expense">("all")
  const [amountMin, setAmountMin] = React.useState<string>("")
  const [amountMax, setAmountMax] = React.useState<string>("")
  const [showUncategorizedOnly, setShowUncategorizedOnly] = React.useState(false)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  
  // Pending filter state (in the popover, before applying)
  const [pendingCategories, setPendingCategories] = React.useState<string[]>([])
  const [pendingType, setPendingType] = React.useState<"all" | "income" | "expense">("all")
  const [pendingAmountMin, setPendingAmountMin] = React.useState<string>("")
  const [pendingAmountMax, setPendingAmountMax] = React.useState<string>("")
  const [pendingUncategorized, setPendingUncategorized] = React.useState(false)
  
  // Sync pending state when popover opens
  React.useEffect(() => {
    if (filtersOpen) {
      setPendingCategories(selectedCategories)
      setPendingType(transactionType)
      setPendingAmountMin(amountMin)
      setPendingAmountMax(amountMax)
      setPendingUncategorized(showUncategorizedOnly)
    }
  }, [filtersOpen])
  
  const applyFilters = () => {
    setSelectedCategories(pendingCategories)
    setTransactionType(pendingType)
    setAmountMin(pendingAmountMin)
    setAmountMax(pendingAmountMax)
    setShowUncategorizedOnly(pendingUncategorized)
    setFiltersOpen(false)
  }
  
  const clearPendingFilters = () => {
    setPendingCategories([])
    setPendingType("all")
    setPendingAmountMin("")
    setPendingAmountMax("")
    setPendingUncategorized(false)
  }
  
  // Apply additional filters to data
  const filteredData = React.useMemo(() => {
    let result = data
    
    // Filter by category
    if (selectedCategories.length > 0) {
      result = result.filter(t => 
        t.category_id && selectedCategories.includes(t.category_id)
      )
    }
    
    // Filter by uncategorized
    if (showUncategorizedOnly) {
      result = result.filter(t => !t.category_id)
    }
    
    // Filter by transaction type
    if (transactionType === "income") {
      result = result.filter(t => t.amount > 0)
    } else if (transactionType === "expense") {
      result = result.filter(t => t.amount < 0)
    }
    
    // Filter by amount range
    const minAmount = amountMin ? parseFloat(amountMin) : null
    const maxAmount = amountMax ? parseFloat(amountMax) : null
    
    if (minAmount !== null) {
      result = result.filter(t => Math.abs(t.amount) >= minAmount)
    }
    if (maxAmount !== null) {
      result = result.filter(t => Math.abs(t.amount) <= maxAmount)
    }
    
    return result
  }, [data, selectedCategories, transactionType, amountMin, amountMax, showUncategorizedOnly])
  
  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (selectedCategories.length > 0) count++
    if (transactionType !== "all") count++
    if (amountMin || amountMax) count++
    if (showUncategorizedOnly) count++
    return count
  }, [selectedCategories, transactionType, amountMin, amountMax, showUncategorizedOnly])
  
  const clearAllFilters = () => {
    setSelectedCategories([])
    setTransactionType("all")
    setAmountMin("")
    setAmountMax("")
    setShowUncategorizedOnly(false)
    setGlobalFilter("")
    onAccountChange("all")
    setColumnFilters([])
  }

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  // Calculate summary from filtered data
  const totalIncome = filteredData.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = filteredData.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const netChange = totalIncome - totalExpenses

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Get selected transactions
  const selectedTransactions = React.useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  }, [rowSelection, filteredData, table])

  const handleBulkAICategorize = async () => {
    await onBulkAICategorize(selectedTransactions)
    setRowSelection({})
  }

  const handleBulkSetCategory = async (categoryId: string | null) => {
    setCategoryLoading(true)
    try {
      const ids = selectedTransactions.map((t) => t.id)
      await onBulkSetCategory(ids, categoryId)
      setCategoryPickerOpen(false)
      setRowSelection({})
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    const ids = selectedTransactions.map((t) => t.id)
    await onBulkDelete(ids)
    setRowSelection({})
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Income</div>
          <div className="text-2xl font-bold text-emerald-600">
            +{formatCurrency(totalIncome)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Expenses</div>
          <div className="text-2xl font-bold text-rose-600">
            -{formatCurrency(totalExpenses)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Net Change</div>
          <div className={`text-2xl font-bold ${netChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {netChange >= 0 ? "+" : ""}{formatCurrency(netChange)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
          </div>

          {/* Account Filter */}
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} -{" "}
                      {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  "All Time"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="flex flex-col gap-1 border-r p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
                  >
                    All Time
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: subMonths(new Date(), 3), to: new Date() })}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: startOfMonth(new Date()), to: new Date() })}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => onDateRangeChange({ from: startOfYear(new Date()), to: new Date() })}
                  >
                    This Year
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) =>
                    onDateRangeChange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Filters Popover */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPendingFilters}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <Select value={pendingType} onValueChange={(v) => setPendingType(v as "all" | "income" | "expense")}>
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

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="max-h-32 overflow-y-auto space-y-2 rounded-md border p-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={pendingCategories.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPendingCategories([...pendingCategories, category.id])
                              setPendingUncategorized(false)
                            } else {
                              setPendingCategories(pendingCategories.filter(id => id !== category.id))
                            }
                          }}
                        />
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Uncategorized Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={pendingUncategorized}
                    onCheckedChange={(checked) => {
                      setPendingUncategorized(checked === true)
                      if (checked) {
                        setPendingCategories([])
                      }
                    }}
                  />
                  <span className="text-sm">Show uncategorized only</span>
                </label>

                {/* Amount Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount Range</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Min"
                        value={pendingAmountMin}
                        onChange={(e) => setPendingAmountMin(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={pendingAmountMax}
                        onChange={(e) => setPendingAmountMax(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear All Filters */}
          {(globalFilter || selectedAccount !== "all" || activeFilterCount > 0) && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button variant="outline" asChild>
            <Link href="/learn/transactions">
              <HelpCircle className="mr-2 h-4 w-4" />
              Need help?
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/transactions/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button onClick={onAddTransaction}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} showRowSelection={true} />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedTransactions={selectedTransactions}
        categories={categories}
        onClearSelection={() => setRowSelection({})}
        onAICategorize={handleBulkAICategorize}
        onSetCategory={handleBulkSetCategory}
        onDelete={handleBulkDelete}
        onOpenCategoryPicker={() => setCategoryPickerOpen(true)}
      />

      {/* Category Picker Dialog */}
      <CategoryPickerDialog
        open={categoryPickerOpen}
        onOpenChange={setCategoryPickerOpen}
        categories={categories}
        selectedCount={selectedTransactions.length}
        onSelect={handleBulkSetCategory}
        loading={categoryLoading}
      />
    </div>
  )
}

