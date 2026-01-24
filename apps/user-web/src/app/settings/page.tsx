import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, Tag, Bell, Shield, CreditCard, Repeat } from "lucide-react"

const settingsItems = [
  {
    title: "Categories",
    description: "Manage expense and income categories",
    href: "/settings/categories",
    icon: Tag,
  },
  {
    title: "Recurring Transactions",
    description: "Set up automatic recurring transactions",
    href: "/settings/recurring",
    icon: Repeat,
  },
  {
    title: "Notifications",
    description: "Configure alerts and reminders",
    href: "/settings/notifications",
    icon: Bell,
    disabled: true,
  },
  {
    title: "Security",
    description: "Password and authentication settings",
    href: "/settings/security",
    icon: Shield,
    disabled: true,
  },
  {
    title: "Billing",
    description: "Manage your subscription and payments",
    href: "/settings/billing",
    icon: CreditCard,
    disabled: true,
  },
]

export default function SettingsPage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.disabled ? "#" : item.href}
              className={item.disabled ? 'pointer-events-none' : ''}
            >
              <Card className={`transition-colors ${item.disabled ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {item.title}
                      {item.disabled && (
                        <span className="text-xs font-normal text-muted-foreground">(Coming soon)</span>
                      )}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  {!item.disabled && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}


