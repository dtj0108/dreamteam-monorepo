import { DashboardLayout } from "@/components/dashboard-layout"
import { NotificationsContent } from "@/components/notifications/notifications-content"

export default function CustomizeNotificationsPage() {
  return (
    <DashboardLayout breadcrumbs={[
      { label: "Customize", href: "/customize" },
      { label: "Notifications" }
    ]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Configure alerts and reminders for your finances.
          </p>
        </div>
        <NotificationsContent />
      </div>
    </DashboardLayout>
  )
}
