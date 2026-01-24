"use client"

import { Wallet, Building2, CreditCard, PiggyBank, TrendingUp } from "lucide-react"
import { ToolResultCard } from "./tool-result-card"
import type { AccountsResult as AccountsResultType } from "@/lib/agent"

interface AccountsResultProps {
  result: AccountsResultType
}

const accountTypeIcons: Record<string, React.ElementType> = {
  checking: Building2,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
}

export function AccountsResult({ result }: AccountsResultProps) {
  const { accounts, summary } = result

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <ToolResultCard
      icon={<Wallet className="size-4" />}
      title="Accounts"
      status="success"
    >
      <div className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Assets: </span>
            <span className="font-medium text-green-600">
              {formatCurrency(summary.totalAssets)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Liabilities: </span>
            <span className="font-medium text-red-600">
              {formatCurrency(summary.totalLiabilities)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Net Worth: </span>
            <span
              className={`font-medium ${
                summary.netWorth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.netWorth)}
            </span>
          </div>
        </div>

        {/* Account list */}
        {accounts.length > 0 && (
          <div className="border rounded-md divide-y text-xs">
            {accounts.map((account) => {
              const Icon = accountTypeIcons[account.type] || Wallet
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{account.name}</div>
                      {account.institution && (
                        <div className="text-muted-foreground">
                          {account.institution}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`font-medium ${
                      account.type === "credit"
                        ? account.balance <= 0
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-foreground"
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">No accounts found.</p>
        )}
      </div>
    </ToolResultCard>
  )
}
