"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Bell, CreditCard, Target, Settings } from "lucide-react"
import { UpcomingRenewalsList } from "@/components/subscriptions/upcoming-renewals"
import { NotificationSettings } from "@/components/notifications/notification-settings"
import { BudgetAlertsList } from "@/components/budgets/budget-alerts-list"

export function NotificationsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          View alerts and manage your notification preferences
        </p>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {/* Upcoming Subscription Renewals */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <CardTitle>Upcoming Subscription Renewals</CardTitle>
              </div>
              <CardDescription>
                Subscriptions renewing in the next 14 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UpcomingRenewalsList daysAhead={14} />
            </CardContent>
          </Card>

          {/* Budget Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-500" />
                <CardTitle>Budget Alerts</CardTitle>
              </div>
              <CardDescription>
                Budgets approaching or exceeding limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetAlertsList threshold={80} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
