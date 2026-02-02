"use client"

import Link from "next/link"
import { 
  Landmark, 
  PiggyBank, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  HandCoins, 
  Wallet,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { Account, AccountType } from "@/lib/types"

const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
  loan: HandCoins,
  other: Wallet,
}

const ACCOUNT_COLORS: Record<AccountType, string> = {
  checking: "bg-blue-100 text-blue-600",
  savings: "bg-emerald-100 text-emerald-600",
  credit_card: "bg-purple-100 text-purple-600",
  cash: "bg-green-100 text-green-600",
  investment: "bg-amber-100 text-amber-600",
  loan: "bg-red-100 text-red-600",
  other: "bg-gray-100 text-gray-600",
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
  other: "Other",
}

interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.type]
  const colorClass = ACCOUNT_COLORS[account.type]
  const isNegative = account.balance < 0
  const isLiability = account.type === 'credit_card' || account.type === 'loan'

  const formatBalance = (balance: number) => {
    const absBalance = Math.abs(balance)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency || 'USD',
    }).format(absBalance)
  }

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <Link 
              href={`/accounts/${account.id}`}
              className="font-semibold hover:underline"
            >
              {account.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </span>
              {account.institution && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {account.institution}
                    {account.last_four && ` ••••${account.last_four}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/accounts/${account.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(account)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${isLiability && account.balance !== 0 ? 'text-rose-600' : ''}`}>
            {isLiability && account.balance !== 0 && '-'}
            {formatBalance(account.balance)}
          </span>
          {!account.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        {/* Credit card limit and available credit */}
        {account.type === 'credit_card' && account.plaid_limit != null && account.plaid_limit > 0 && (
          <div className="mt-3 pt-3 border-t text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Credit Limit</span>
              <span>{formatBalance(account.plaid_limit)}</span>
            </div>
            {account.plaid_available_balance != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available Credit</span>
                <span className="text-emerald-600 font-medium">
                  {formatBalance(account.plaid_available_balance)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


