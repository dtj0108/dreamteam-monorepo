"use client"

import { Receipt, TrendingUp, TrendingDown } from "lucide-react"
import { ToolResultCard } from "./tool-result-card"
import type { TransactionsResult as TransactionsResultType } from "@/lib/agent"

interface TransactionsResultProps {
  result: TransactionsResultType
}

export function TransactionsResult({ result }: TransactionsResultProps) {
  const { transactions, summary } = result

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <ToolResultCard
      icon={<Receipt className="size-4" />}
      title="Transactions"
      status="success"
    >
      <div className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="size-3 text-green-500" />
            <span className="text-muted-foreground">Income:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="size-3 text-red-500" />
            <span className="text-muted-foreground">Expenses:</span>
            <span className="font-medium text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Net:</span>
            <span
              className={`font-medium ${
                summary.netChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.netChange)}
            </span>
          </div>
        </div>

        {/* Transaction list */}
        {transactions.length > 0 && (
          <div className="border rounded-md divide-y text-xs max-h-48 overflow-y-auto">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-2 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate">{tx.description}</div>
                  <div className="text-muted-foreground">
                    {tx.date} {tx.category && `· ${tx.category}`}
                  </div>
                </div>
                <div
                  className={`font-medium ml-2 ${
                    tx.amount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length > 10 && (
          <p className="text-xs text-muted-foreground">
            Showing 10 of {summary.count} transactions
          </p>
        )}
      </div>
    </ToolResultCard>
  )
}
