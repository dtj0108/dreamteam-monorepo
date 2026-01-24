"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  CreditCard,
  Calendar,
  Bell,
  Tag,
  FileText,
  Pause,
  Play,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  FREQUENCY_LABELS,
  calculateDaysUntilRenewal,
  calculateMonthlyEquivalent,
} from "@/lib/types"
import type { SubscriptionWithCategory, RecurringFrequency } from "@/lib/types"

export default function SubscriptionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const subscriptionId = params.id as string

  const [subscription, setSubscription] = useState<SubscriptionWithCategory | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  const loadSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`)
      if (!response.ok) {
        router.push("/subscriptions")
        return
      }
      const data = await response.json()
      setSubscription(data)
    } catch (error) {
      console.error("Failed to load subscription:", error)
      router.push("/subscriptions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [subscriptionId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        router.push("/subscriptions")
      }
    } catch (error) {
      console.error("Failed to delete subscription:", error)
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleToggleActive = async () => {
    if (!subscription) return
    setToggling(true)
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !subscription.is_active }),
      })
      if (response.ok) {
        loadSubscription()
      }
    } catch (error) {
      console.error("Failed to toggle subscription:", error)
    } finally {
      setToggling(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(value))
  }

  if (loading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Subscriptions", href: "/subscriptions" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!subscription) {
    return null
  }

  const daysUntilRenewal = calculateDaysUntilRenewal(subscription.next_renewal_date)
  const monthlyEquivalent = calculateMonthlyEquivalent(
    subscription.amount,
    subscription.frequency as RecurringFrequency
  )

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Subscriptions", href: "/subscriptions" },
        { label: subscription.name },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/subscriptions")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{subscription.name}</h1>
                  <Badge variant={subscription.is_active ? "default" : "secondary"}>
                    {subscription.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatCurrency(subscription.amount)} / {FREQUENCY_LABELS[subscription.frequency as RecurringFrequency]?.toLowerCase() || subscription.frequency}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : subscription.is_active ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {subscription.is_active ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Billing Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Amount</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(subscription.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {FREQUENCY_LABELS[subscription.frequency as RecurringFrequency] || subscription.frequency}
                  </p>
                </div>
              </div>

              {subscription.frequency !== "monthly" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly equivalent</span>
                  <span className="font-medium">{formatCurrency(monthlyEquivalent)}/mo</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Next Renewal</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {format(new Date(subscription.next_renewal_date), "MMMM d, yyyy")}
                  </p>
                  <Badge
                    variant={daysUntilRenewal <= 3 ? "default" : "secondary"}
                    className={daysUntilRenewal <= 3 ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    {daysUntilRenewal === 0
                      ? "Today"
                      : daysUntilRenewal === 1
                      ? "Tomorrow"
                      : `In ${daysUntilRenewal} days`}
                  </Badge>
                </div>
              </div>

              {subscription.last_charge_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Charge</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(subscription.last_charge_date), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscription.category && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Category</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: subscription.category.color }}
                    />
                    <span className="font-medium">{subscription.category.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Reminder</span>
                </div>
                <span className="font-medium">
                  {subscription.reminder_days_before === 1
                    ? "1 day before"
                    : `${subscription.reminder_days_before} days before`}
                </span>
              </div>

              {subscription.merchant_pattern && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Merchant Pattern</span>
                  </div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {subscription.merchant_pattern}
                  </code>
                </div>
              )}

              {subscription.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{subscription.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
              <DialogDescription>
                Update your subscription details.
              </DialogDescription>
            </DialogHeader>
            <SubscriptionForm
              subscription={subscription}
              onSuccess={() => {
                setEditDialogOpen(false)
                loadSubscription()
              }}
              onCancel={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{subscription.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
