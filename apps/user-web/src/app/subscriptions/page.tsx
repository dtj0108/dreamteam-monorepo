"use client"

import { useEffect, useState } from "react"
import { Plus, CreditCard, DollarSign, CalendarClock, Bell } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SubscriptionCard } from "@/components/subscriptions/subscription-card"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { SubscriptionDetector } from "@/components/subscriptions/subscription-detector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { SubscriptionWithCategory } from "@/lib/types"
import { calculateMonthlyEquivalent, calculateDaysUntilRenewal } from "@/lib/types"

interface SubscriptionSummary {
  totalMonthly: number
  activeCount: number
  upcomingThisWeek: number
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([])
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithCategory | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const loadSubscriptions = async () => {
    try {
      const [subsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/subscriptions${showInactive ? "?includeInactive=true" : ""}`),
        fetch("/api/subscriptions?summary=true"),
      ])

      if (!subsResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to fetch subscriptions")
      }

      const subsData = await subsResponse.json()
      const summaryData = await summaryResponse.json()

      setSubscriptions(subsData)
      setSummary(summaryData)
    } catch (error) {
      console.error("Failed to load subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscriptions()
  }, [showInactive])

  const handleEdit = (subscription: SubscriptionWithCategory) => {
    setEditingSubscription(subscription)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingSubscription(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    setEditingSubscription(null)
    loadSubscriptions()
  }

  const handleToggleActive = async (subscription: SubscriptionWithCategory) => {
    setActionLoading(subscription.id)
    try {
      await fetch(`/api/subscriptions/${subscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !subscription.is_active }),
      })
      loadSubscriptions()
    } catch (error) {
      console.error("Failed to toggle subscription:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setActionLoading(deleteId)
    try {
      await fetch(`/api/subscriptions/${deleteId}`, {
        method: "DELETE",
      })
      setDeleteId(null)
      loadSubscriptions()
    } catch (error) {
      console.error("Failed to delete subscription:", error)
    } finally {
      setActionLoading(null)
    }
  }

  // Group subscriptions by upcoming status
  const upcomingSubs = subscriptions.filter((s) => {
    const days = calculateDaysUntilRenewal(s.next_renewal_date)
    return days >= 0 && days <= 7 && s.is_active
  })

  const activeSubs = subscriptions.filter((s) => s.is_active)
  const inactiveSubs = subscriptions.filter((s) => !s.is_active)

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Subscriptions" }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Track and manage your recurring charges and subscriptions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Monthly Cost
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalMonthly || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency((summary?.totalMonthly || 0) * 12)}/year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Subscriptions
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary?.activeCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inactiveSubs.length} paused
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Upcoming This Week
                  </CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary?.upcomingThisWeek || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    renewals in next 7 days
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Upcoming Renewals Alert */}
        {upcomingSubs.length > 0 && (
          <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Bell className="h-4 w-4" />
                Upcoming Renewals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingSubs.map((sub) => {
                  const days = calculateDaysUntilRenewal(sub.next_renewal_date)
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{sub.name}</span>
                      <span className="text-muted-foreground">
                        {days === 0
                          ? "Today"
                          : days === 1
                          ? "Tomorrow"
                          : `In ${days} days`}{" "}
                        • {formatCurrency(Math.abs(sub.amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscriptions List */}
        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeSubs.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({inactiveSubs.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <SubscriptionDetector onSubscriptionAdded={loadSubscriptions} />
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subscription
              </Button>
            </div>
          </div>

          <TabsContent value="active" className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : activeSubs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium">No active subscriptions</p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Add your first subscription or use the detection feature to find
                    them automatically.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <SubscriptionDetector onSubscriptionAdded={loadSubscriptions} />
                    <Button onClick={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subscription
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              activeSubs.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={(id) => setDeleteId(id)}
                  loading={actionLoading === subscription.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="paused" className="space-y-3">
            {inactiveSubs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No paused subscriptions</p>
                </CardContent>
              </Card>
            ) : (
              inactiveSubs.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={(id) => setDeleteId(id)}
                  loading={actionLoading === subscription.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? "Edit Subscription" : "Add Subscription"}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription
                ? "Update your subscription details."
                : "Add a new subscription to track."}
            </DialogDescription>
          </DialogHeader>
          <SubscriptionForm
            subscription={editingSubscription || undefined}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}

