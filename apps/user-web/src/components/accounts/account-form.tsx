"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Landmark, 
  PiggyBank, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  HandCoins, 
  Wallet 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAccount, updateAccount } from "@/lib/queries"
import { useUser } from "@/hooks/use-user"
import type { Account, AccountType, CreateAccountInput } from "@/lib/types"

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ElementType }[] = [
  { value: 'checking', label: 'Checking', icon: Landmark },
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'investment', label: 'Investment', icon: TrendingUp },
  { value: 'loan', label: 'Loan', icon: HandCoins },
  { value: 'other', label: 'Other', icon: Wallet },
]

interface AccountFormProps {
  account?: Account
  onSuccess?: () => void
}

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateAccountInput>({
    name: account?.name || '',
    type: account?.type || 'checking',
    balance: account?.balance || 0,
    institution: account?.institution || '',
    last_four: account?.last_four || '',
    currency: account?.currency || 'USD',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }
      
      if (account) {
        await updateAccount(account.id, formData)
      } else {
        await createAccount(formData, user.id)
      }
      onSuccess?.()
      router.push('/accounts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{account ? 'Edit Account' : 'Add New Account'}</CardTitle>
        <CardDescription>
          {account 
            ? 'Update your account details below.'
            : 'Enter your account details to start tracking your finances.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              placeholder="e.g., Chase Checking, Emergency Fund"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="balance">
                {formData.type === 'credit_card' || formData.type === 'loan' 
                  ? 'Current Balance (Owed)' 
                  : 'Current Balance'
                }
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.balance || ''}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {(formData.type === 'credit_card' || formData.type === 'loan') && (
                <p className="text-xs text-muted-foreground">
                  Enter the amount you owe as a positive number
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution (optional)</Label>
              <Input
                id="institution"
                placeholder="e.g., Chase, Bank of America"
                value={formData.institution || ''}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_four">Last 4 Digits (optional)</Label>
              <Input
                id="last_four"
                placeholder="1234"
                maxLength={4}
                value={formData.last_four || ''}
                onChange={(e) => setFormData({ ...formData, last_four: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (account ? 'Save Changes' : 'Add Account')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


