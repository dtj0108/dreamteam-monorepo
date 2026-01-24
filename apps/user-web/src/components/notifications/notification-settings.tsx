"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bell, Mail, TrendingUp, Target, Wallet, Save, Loader2, CreditCard } from "lucide-react"

export function NotificationSettings() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Notification preferences
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [goalProgress, setGoalProgress] = useState(true)
  const [subscriptionReminders, setSubscriptionReminders] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [monthlySummary, setMonthlySummary] = useState(true)
  const [lowBalance, setLowBalance] = useState(false)
  const [largeTransactions, setLargeTransactions] = useState(false)
  const [summaryDay, setSummaryDay] = useState("monday")

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-600" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage which emails you receive from dreamteam.ai
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Budget Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="budget-alerts" className="font-medium">
                  Budget Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you&apos;re approaching or exceeding budget limits
                </p>
              </div>
            </div>
            <Switch
              id="budget-alerts"
              checked={budgetAlerts}
              onCheckedChange={setBudgetAlerts}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>

          {/* Goal Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="goal-progress" className="font-medium">
                  Goal Progress Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates on your revenue, profit, and exit goal progress
                </p>
              </div>
            </div>
            <Switch
              id="goal-progress"
              checked={goalProgress}
              onCheckedChange={setGoalProgress}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>

          {/* Low Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="low-balance" className="font-medium">
                  Low Balance Warnings
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alert when any account balance falls below a threshold
                </p>
              </div>
            </div>
            <Switch
              id="low-balance"
              checked={lowBalance}
              onCheckedChange={setLowBalance}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>

          {/* Large Transactions */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="large-transactions" className="font-medium">
                  Large Transaction Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified for transactions above a certain amount
                </p>
              </div>
            </div>
            <Switch
              id="large-transactions"
              checked={largeTransactions}
              onCheckedChange={setLargeTransactions}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>

          {/* Subscription Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="subscription-reminders" className="font-medium">
                  Subscription Renewal Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded before subscriptions renew
                </p>
              </div>
            </div>
            <Switch
              id="subscription-reminders"
              checked={subscriptionReminders}
              onCheckedChange={setSubscriptionReminders}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-600" />
            <CardTitle>Summary Reports</CardTitle>
          </div>
          <CardDescription>
            Receive periodic summaries of your financial activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Summary */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly-summary" className="font-medium">
                Weekly Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly overview of income, expenses, and trends
              </p>
            </div>
            <Switch
              id="weekly-summary"
              checked={weeklySummary}
              onCheckedChange={setWeeklySummary}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>

          {weeklySummary && (
            <div className="ml-0 pl-4 border-l-2 border-muted">
              <Label htmlFor="summary-day" className="text-sm">
                Send weekly summary on
              </Label>
              <Select value={summaryDay} onValueChange={setSummaryDay}>
                <SelectTrigger id="summary-day" className="w-40 mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                  <SelectItem value="saturday">Saturday</SelectItem>
                  <SelectItem value="sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monthly Summary */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="monthly-summary" className="font-medium">
                Monthly Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a detailed monthly report at the start of each month
              </p>
            </div>
            <Switch
              id="monthly-summary"
              checked={monthlySummary}
              onCheckedChange={setMonthlySummary}
              className="data-[state=unchecked]:!bg-gray-400 data-[state=checked]:!bg-sky-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-6 mt-2 border-t">
          <div>
            {saved && (
              <p className="text-sm text-green-600">Preferences saved successfully!</p>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Notification preferences are saved locally for now. In a future update,
            these will sync with your account and trigger real email notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
