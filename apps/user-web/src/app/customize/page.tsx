import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, Tag, Bell, Shield, CreditCard, Repeat } from "lucide-react"

const customizeItems = [
  {
    title: "Categories",
    description: "Manage expense and income categories",
    href: "/customize/categories",
    icon: Tag,
  },
  {
    title: "Recurring Transactions",
    description: "Set up automatic recurring transactions",
    href: "/customize/recurring",
    icon: Repeat,
  },
  {
    title: "Notifications",
    description: "Configure alerts and reminders",
    href: "/customize/notifications",
    icon: Bell,
  },
  {
    title: "Security",
    description: "Password and authentication settings",
    href: "/customize/security",
    icon: Shield,
  },
  {
    title: "Billing",
    description: "Manage your subscription and payments",
    href: "/customize/billing",
    icon: CreditCard,
  },
]

export default function CustomizePage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Customize" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customize</h1>
          <p className="text-muted-foreground">
            Customize your account settings and preferences.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {customizeItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {item.title}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}


