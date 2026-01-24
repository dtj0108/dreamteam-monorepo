"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RecurringRulesList } from "@/components/recurring/recurring-rules-list"
import { RecurringRuleForm } from "@/components/recurring/recurring-rule-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getRecurringRules } from "@/lib/queries"
import type { RecurringRule } from "@/lib/types"

export default function RecurringSettingsPage() {
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null)

  const loadRules = async () => {
    try {
      const data = await getRecurringRules()
      setRules(data)
    } catch (error) {
      console.error('Failed to load recurring rules:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const handleEdit = (rule: RecurringRule) => {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingRule(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    setEditingRule(null)
    loadRules()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Customize", href: "/customize" },
        { label: "Recurring Transactions" }
      ]}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>
                Set up automatic recurring transactions like rent, subscriptions, or salary deposits.
                These will be created automatically on their scheduled dates.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Recurring Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <RecurringRulesList 
              rules={rules} 
              onEdit={handleEdit}
              onUpdate={loadRules}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingRule 
                ? 'Update your recurring transaction details.'
                : 'Set up a new recurring transaction that will be created automatically.'
              }
            </DialogDescription>
          </DialogHeader>
          <RecurringRuleForm 
            rule={editingRule || undefined}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}


