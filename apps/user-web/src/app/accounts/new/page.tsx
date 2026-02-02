"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Landmark, Link2, PenLine } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountForm } from "@/components/accounts/account-form"
import { PlaidLinkButton } from "@/components/plaid/plaid-link-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AddMethod = "choose" | "plaid" | "manual"

export default function NewAccountPage() {
  const router = useRouter()
  const [method, setMethod] = useState<AddMethod>("choose")

  const handlePlaidSuccess = () => {
    router.push("/accounts")
    router.refresh()
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Accounts", href: "/accounts" },
        { label: "Add Account" }
      ]}
    >
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Account</h1>
          <p className="text-muted-foreground">
            Connect your bank automatically or add an account manually.
          </p>
        </div>

        {/* Method Selection */}
        {method === "choose" && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Connect Bank Option */}
            <Card
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                "group"
              )}
              onClick={() => setMethod("plaid")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Connect Bank</CardTitle>
                    <CardDescription className="text-xs">
                      Recommended
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Securely link your bank account to automatically import transactions and sync balances.
                </p>
              </CardContent>
            </Card>

            {/* Manual Entry Option */}
            <Card
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                "group"
              )}
              onClick={() => setMethod("manual")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2 group-hover:bg-muted/80 transition-colors">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Manual Entry</CardTitle>
                    <CardDescription className="text-xs">
                      For cash or unsupported banks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Manually enter account details. You&apos;ll need to update balances and add transactions yourself.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plaid Connection Flow */}
        {method === "plaid" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Connect Your Bank</CardTitle>
                  <CardDescription>
                    Securely connect using Plaid to automatically sync your accounts and transactions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bank-level security</p>
                    <p className="text-xs text-muted-foreground">Your credentials are never stored by DreamTeam</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Automatic sync</p>
                    <p className="text-xs text-muted-foreground">Transactions and balances update automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">10,000+ institutions</p>
                    <p className="text-xs text-muted-foreground">Connect to most US banks and credit unions</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMethod("choose")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <div className="flex-1" />
                <PlaidLinkButton
                  onSuccess={handlePlaidSuccess}
                  className="w-auto"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Entry Form */}
        {method === "manual" && (
          <div className="space-y-4">
            <button
              onClick={() => setMethod("choose")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to options
            </button>
            <AccountForm />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
