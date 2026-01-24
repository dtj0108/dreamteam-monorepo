"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Loader2,
  Sparkles,
  Check,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { DetectedSubscription } from "@/lib/types"
import { FREQUENCY_LABELS } from "@/lib/types"

interface DetectionResult {
  detected: DetectedSubscription[]
  analyzed_transactions: number
}

interface SubscriptionDetectorProps {
  onSubscriptionAdded: () => void
}

export function SubscriptionDetector({ onSubscriptionAdded }: SubscriptionDetectorProps) {
  const [detecting, setDetecting] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount))
  }

  const handleDetect = async () => {
    setDetecting(true)
    setResult(null)
    setAddedIds(new Set())
    setSelectedPatterns(new Set())

    try {
      const response = await fetch("/api/subscriptions/detect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Detection failed")
      }

      const data: DetectionResult = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Failed to detect subscriptions:", error)
    } finally {
      setDetecting(false)
    }
  }

  const handleAddSubscription = async (detected: DetectedSubscription) => {
    setSaving(detected.merchant_pattern)

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detected.name,
          merchant_pattern: detected.merchant_pattern,
          amount: detected.amount,
          frequency: detected.frequency,
          next_renewal_date: detected.next_renewal_date,
          last_charge_date: detected.last_charge_date,
          is_auto_detected: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add subscription")
      }

      setAddedIds((prev) => new Set(prev).add(detected.merchant_pattern))
      onSubscriptionAdded()
    } catch (error) {
      console.error("Failed to add subscription:", error)
    } finally {
      setSaving(null)
    }
  }

  const handleToggleSelect = (pattern: string) => {
    setSelectedPatterns((prev) => {
      const next = new Set(prev)
      if (next.has(pattern)) {
        next.delete(pattern)
      } else {
        next.add(pattern)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (!result) return
    const notAddedPatterns = result.detected
      .filter((d) => !addedIds.has(d.merchant_pattern))
      .map((d) => d.merchant_pattern)

    const allSelected = notAddedPatterns.every((p) => selectedPatterns.has(p))

    if (allSelected) {
      setSelectedPatterns(new Set())
    } else {
      setSelectedPatterns(new Set(notAddedPatterns))
    }
  }

  const handleAddSelected = async () => {
    if (!result || selectedPatterns.size === 0) return
    setBulkSaving(true)

    const toAdd = result.detected.filter(
      (d) => selectedPatterns.has(d.merchant_pattern) && !addedIds.has(d.merchant_pattern)
    )

    for (const detected of toAdd) {
      try {
        const response = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: detected.name,
            merchant_pattern: detected.merchant_pattern,
            amount: detected.amount,
            frequency: detected.frequency,
            next_renewal_date: detected.next_renewal_date,
            last_charge_date: detected.last_charge_date,
            is_auto_detected: true,
          }),
        })

        if (response.ok) {
          setAddedIds((prev) => new Set(prev).add(detected.merchant_pattern))
        }
      } catch (error) {
        console.error("Failed to add subscription:", error)
      }
    }

    setSelectedPatterns(new Set())
    setBulkSaving(false)
    onSubscriptionAdded()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "text-emerald-600"
    if (confidence >= 50) return "text-amber-600"
    return "text-gray-500"
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 70) return "High"
    if (confidence >= 50) return "Medium"
    return "Low"
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => !result && handleDetect()}>
          <Sparkles className="mr-2 h-4 w-4" />
          Detect Subscriptions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Subscription Detection
          </DialogTitle>
          <DialogDescription>
            We analyze your transaction history to automatically detect recurring
            charges that might be subscriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {detecting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                Analyzing your transactions...
              </p>
            </div>
          ) : result ? (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Analyzed {result.analyzed_transactions} transactions</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDetect}
                >
                  Scan Again
                </Button>
              </div>

              {result.detected.length > 0 && (
                <div className="flex items-center justify-between py-2 px-1 border-b">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        result.detected.filter((d) => !addedIds.has(d.merchant_pattern)).length > 0 &&
                        result.detected
                          .filter((d) => !addedIds.has(d.merchant_pattern))
                          .every((d) => selectedPatterns.has(d.merchant_pattern))
                      }
                      onCheckedChange={handleSelectAll}
                      disabled={result.detected.every((d) => addedIds.has(d.merchant_pattern))}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select All ({result.detected.filter((d) => !addedIds.has(d.merchant_pattern)).length} available)
                    </label>
                  </div>
                  {selectedPatterns.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleAddSelected}
                      disabled={bulkSaving}
                    >
                      {bulkSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Add Selected ({selectedPatterns.size})
                    </Button>
                  )}
                </div>
              )}

              {result.detected.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="font-medium">No subscriptions detected</p>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      We couldn&apos;t find any recurring charges in your transaction
                      history. Try adding more transactions or add subscriptions
                      manually.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {result.detected.map((detected) => {
                    const isAdded = addedIds.has(detected.merchant_pattern)
                    const isSaving = saving === detected.merchant_pattern
                    const isExpanded = expandedId === detected.merchant_pattern

                    return (
                      <Collapsible
                        key={detected.merchant_pattern}
                        open={isExpanded}
                        onOpenChange={(open) =>
                          setExpandedId(open ? detected.merchant_pattern : null)
                        }
                      >
                        <Card className={isAdded ? "bg-muted/50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              {!isAdded && (
                                <Checkbox
                                  checked={selectedPatterns.has(detected.merchant_pattern)}
                                  onCheckedChange={() => handleToggleSelect(detected.merchant_pattern)}
                                  className="mt-1"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold truncate">
                                    {detected.name}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {FREQUENCY_LABELS[detected.frequency]}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 mt-1 text-sm">
                                  <span className="font-medium">
                                    {formatCurrency(detected.amount)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {detected.transaction_count} charges found
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    Confidence:
                                  </span>
                                  <Progress
                                    value={detected.confidence}
                                    className="h-1.5 w-20"
                                  />
                                  <span
                                    className={`text-xs font-medium ${getConfidenceColor(
                                      detected.confidence
                                    )}`}
                                  >
                                    {getConfidenceLabel(detected.confidence)} (
                                    {detected.confidence}%)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isAdded ? (
                                  <Badge className="bg-emerald-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Added
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddSubscription(detected)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="h-4 w-4 mr-1" />
                                        Add
                                      </>
                                    )}
                                  </Button>
                                )}

                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>

                            <CollapsibleContent>
                              <div className="mt-4 pt-4 border-t">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Sample Transactions
                                </p>
                                <div className="space-y-1">
                                  {detected.sample_transactions.map((tx, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="text-muted-foreground">
                                        {format(new Date(tx.date), "MMM d, yyyy")}
                                      </span>
                                      <span className="truncate mx-2 flex-1">
                                        {tx.description}
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(tx.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground">
                                  Next renewal:{" "}
                                  {format(
                                    new Date(detected.next_renewal_date),
                                    "MMMM d, yyyy"
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </CardContent>
                        </Card>
                      </Collapsible>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
                <p className="font-medium">Ready to scan</p>
                <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                  Click the button below to analyze your transactions and find
                  recurring charges that might be subscriptions.
                </p>
                <Button className="mt-4" onClick={handleDetect}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Detection
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

