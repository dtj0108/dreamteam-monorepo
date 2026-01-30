"use client"

import * as React from "react"
import { Button } from "@dreamteam/ui/button"
import { Input } from "@dreamteam/ui/input"
import { Label } from "@dreamteam/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dreamteam/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dreamteam/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dreamteam/ui/dialog"
import {
  SearchIcon,
  PhoneIcon,
  MessageSquareIcon,
  Loader2Icon,
  StarIcon,
  Trash2Icon,
  CheckIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  PencilIcon,
  MailIcon,
} from "lucide-react"
import { PHONE_PRICING, formatAddOnPrice } from "@/types/addons"
import { Badge } from "@dreamteam/ui/badge"

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string
  region: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

interface OwnedNumber {
  id: string
  twilio_sid: string
  phone_number: string
  friendly_name: string | null
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
  is_primary: boolean
  created_at: string
  campaign?: {
    id: string
    campaign_name: string
  }
}

export function PhoneNumberManager() {
  const [ownedNumbers, setOwnedNumbers] = React.useState<OwnedNumber[]>([])
  const [availableNumbers, setAvailableNumbers] = React.useState<AvailableNumber[]>([])
  const [isLoadingOwned, setIsLoadingOwned] = React.useState(true)
  const [isSearching, setIsSearching] = React.useState(false)
  const [isPurchasing, setIsPurchasing] = React.useState<string | null>(null)
  const [isReleasing, setIsReleasing] = React.useState<string | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)

  // Search form state
  const [country, setCountry] = React.useState("US")
  const [areaCode, setAreaCode] = React.useState("")
  const [numberType, setNumberType] = React.useState<"local" | "tollFree" | "mobile">("local")

  // Confirm dialogs
  const [releaseDialog, setReleaseDialog] = React.useState<OwnedNumber | null>(null)
  const [purchaseDialog, setPurchaseDialog] = React.useState<AvailableNumber | null>(null)

  // Edit friendly name dialog
  const [editDialog, setEditDialog] = React.useState<OwnedNumber | null>(null)
  const [editFriendlyName, setEditFriendlyName] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Error state
  const [error, setError] = React.useState<string | null>(null)

  // Fetch owned numbers on mount
  React.useEffect(() => {
    fetchOwnedNumbers()
  }, [])

  const fetchOwnedNumbers = async () => {
    setIsLoadingOwned(true)
    try {
      const res = await fetch("/api/twilio/numbers/owned")
      if (res.ok) {
        const data = await res.json()
        const numbers = data.numbers || []

        // Fetch campaign associations for each number
        const numbersWithCampaigns = await Promise.all(
          numbers.map(async (number: OwnedNumber) => {
            try {
              // Check if this number is assigned to a campaign
              // We'll need to query all campaigns and check their assignments
              const campaignsRes = await fetch("/api/a2p/campaigns")
              if (campaignsRes.ok) {
                const campaignsData = await campaignsRes.json()
                for (const campaign of campaignsData.campaigns || []) {
                  const numbersRes = await fetch(`/api/a2p/campaigns/${campaign.id}/numbers`)
                  if (numbersRes.ok) {
                    const numbersData = await numbersRes.json()
                    const assignment = numbersData.numbers?.find(
                      (n: any) => n.phone_number_id === number.id
                    )
                    if (assignment) {
                      return {
                        ...number,
                        campaign: {
                          id: campaign.id,
                          campaign_name: campaign.campaign_name,
                        },
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Failed to fetch campaign for number:", err)
            }
            return number
          })
        )

        setOwnedNumbers(numbersWithCampaigns)
      }
    } catch (error) {
      console.error("Failed to fetch owned numbers:", error)
    } finally {
      setIsLoadingOwned(false)
    }
  }

  const syncFromTwilio = async () => {
    setIsSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/twilio/numbers/sync", {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to sync from Twilio")
        return
      }

      if (data.synced > 0) {
        // Refresh the list to show newly synced numbers
        await fetchOwnedNumbers()
      } else {
        setError("All numbers are already synced")
      }
    } catch (err) {
      console.error("Failed to sync from Twilio:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  const searchNumbers = async () => {
    setIsSearching(true)
    setAvailableNumbers([])
    try {
      const params = new URLSearchParams({
        country,
        type: numberType,
        limit: "20",
      })
      if (areaCode) params.set("areaCode", areaCode)

      const res = await fetch(`/api/twilio/numbers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableNumbers(data.numbers || [])
      }
    } catch (error) {
      console.error("Failed to search numbers:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const recalculatePhoneBilling = async () => {
    try {
      await fetch("/api/addons/phone-numbers", { method: "POST" })
    } catch (err) {
      console.error("Failed to recalculate phone billing:", err)
    }
  }

  const confirmPurchase = async (number: AvailableNumber | null) => {
    if (!number) return

    setError(null)
    setIsPurchasing(number.phoneNumber)
    try {
      const res = await fetch("/api/twilio/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: number.phoneNumber, numberType }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to purchase number. Please try again.")
        return
      }

      // Remove from available list
      setAvailableNumbers((prev) => prev.filter((n) => n.phoneNumber !== number.phoneNumber))
      // Refresh owned numbers and recalculate billing
      await fetchOwnedNumbers()
      await recalculatePhoneBilling()
    } catch (err) {
      console.error("Failed to purchase number:", err)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsPurchasing(null)
      setPurchaseDialog(null)
    }
  }

  const releaseNumber = async (number: OwnedNumber) => {
    setIsReleasing(number.id)
    try {
      const res = await fetch("/api/twilio/numbers/owned", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: number.id, twilioSid: number.twilio_sid }),
      })

      if (res.ok) {
        setOwnedNumbers((prev) => prev.filter((n) => n.id !== number.id))
        // Recalculate billing after releasing number
        await recalculatePhoneBilling()
      }
    } catch (error) {
      console.error("Failed to release number:", error)
    } finally {
      setIsReleasing(null)
      setReleaseDialog(null)
    }
  }

  const setPrimaryNumber = async (number: OwnedNumber) => {
    try {
      const res = await fetch("/api/twilio/numbers/owned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: number.id,
          twilioSid: number.twilio_sid,
          isPrimary: true,
        }),
      })

      if (res.ok) {
        // Update local state
        setOwnedNumbers((prev) =>
          prev.map((n) => ({
            ...n,
            is_primary: n.id === number.id,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to set primary number:", error)
    }
  }

  const openEditDialog = (number: OwnedNumber) => {
    setEditFriendlyName(number.friendly_name || "")
    setEditDialog(number)
  }

  const updateFriendlyName = async () => {
    if (!editDialog) return

    setIsUpdating(true)
    setError(null)
    try {
      const res = await fetch("/api/twilio/numbers/owned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDialog.id,
          friendlyName: editFriendlyName,
        }),
      })

      if (res.ok) {
        // Update local state
        setOwnedNumbers((prev) =>
          prev.map((n) =>
            n.id === editDialog.id
              ? { ...n, friendly_name: editFriendlyName || null }
              : n
          )
        )
        setEditDialog(null)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to update friendly name")
      }
    } catch (err) {
      console.error("Failed to update friendly name:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Format +1XXXXXXXXXX to (XXX) XXX-XXXX
    const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return phone
  }

  return (
    <div className="space-y-6">
      {/* Owned Numbers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Your Phone Numbers</CardTitle>
            <CardDescription>
              Phone numbers you own for sending SMS and making calls
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncFromTwilio}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4 mr-2" />
            )}
            Sync from Twilio
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingOwned ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : ownedNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PhoneIcon className="size-12 mx-auto mb-3 opacity-50" />
              <p>You don&apos;t have any phone numbers yet.</p>
              <p className="text-sm">Search and purchase a number below to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownedNumbers.map((number) => (
                <div
                  key={number.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                      <PhoneIcon className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatPhoneNumber(number.phone_number)}
                        </span>
                        {number.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                            <StarIcon className="size-3" />
                            Primary
                          </span>
                        )}
                        {number.campaign && (
                          <Badge variant="secondary" className="gap-1">
                            <MailIcon className="size-3" />
                            {number.campaign.campaign_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {number.friendly_name && (
                          <span>{number.friendly_name}</span>
                        )}
                        <span className="flex items-center gap-1">
                          {number.capabilities.sms && (
                            <MessageSquareIcon className="size-3" />
                          )}
                          {number.capabilities.voice && (
                            <PhoneIcon className="size-3" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/sales/settings/messaging'}
                      title={number.campaign ? "Change campaign assignment" : "Assign to campaign"}
                    >
                      <MailIcon className="size-4 mr-1" />
                      {number.campaign ? "Change Campaign" : "Assign to Campaign"}
                    </Button>
                    {!number.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryNumber(number)}
                      >
                        <StarIcon className="size-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(number)}
                      title="Edit friendly name"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setReleaseDialog(number)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Purchase Section */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase a New Number</CardTitle>
          <CardDescription>
            Search for available phone numbers to add to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Form */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="areaCode">Area Code (optional)</Label>
              <Input
                id="areaCode"
                placeholder="e.g., 415"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                maxLength={3}
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="type">Type</Label>
              <Select value={numberType} onValueChange={(v) => setNumberType(v as typeof numberType)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="tollFree">Toll-Free</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={searchNumbers} disabled={isSearching}>
                {isSearching ? (
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                ) : (
                  <SearchIcon className="size-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                &times;
              </button>
            </div>
          )}

          {/* Available Numbers */}
          {availableNumbers.length > 0 && (
            <div className="border rounded-lg divide-y">
              {availableNumbers.map((number) => (
                <div
                  key={number.phoneNumber}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <div className="font-medium">
                      {formatPhoneNumber(number.phoneNumber)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[number.locality, number.region].filter(Boolean).join(", ")}
                      <span className="ml-2 inline-flex items-center gap-1">
                        {number.capabilities.sms && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            SMS
                          </span>
                        )}
                        {number.capabilities.voice && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Voice
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPurchaseDialog(number)}
                    disabled={isPurchasing === number.phoneNumber}
                  >
                    {isPurchasing === number.phoneNumber ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <>
                        <CheckIcon className="size-4 mr-1" />
                        Purchase
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Release Confirmation Dialog */}
      <Dialog open={!!releaseDialog} onOpenChange={() => setReleaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Phone Number</DialogTitle>
            <DialogDescription>
              Are you sure you want to release {releaseDialog?.phone_number}? This action
              cannot be undone and you may not be able to get this number back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => releaseDialog && releaseNumber(releaseDialog)}
              disabled={isReleasing === releaseDialog?.id}
            >
              {isReleasing === releaseDialog?.id ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : null}
              Release Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Phone Number</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                You are about to purchase {purchaseDialog && formatPhoneNumber(purchaseDialog.phoneNumber)}
              </span>
              <span className="block text-sm">
                {purchaseDialog?.locality && purchaseDialog?.region && (
                  <span className="text-muted-foreground">
                    Location: {purchaseDialog.locality}, {purchaseDialog.region}
                  </span>
                )}
              </span>
              <span className="block text-sm font-medium mt-3">
                Monthly cost: {formatAddOnPrice(numberType === "tollFree" ? PHONE_PRICING.tollFree : PHONE_PRICING.local)}/month
              </span>
              <span className="block text-xs text-muted-foreground">
                {numberType === "tollFree" ? "Toll-free" : "Local"} numbers are billed monthly to your account.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmPurchase(purchaseDialog)}
              disabled={isPurchasing === purchaseDialog?.phoneNumber}
            >
              {isPurchasing === purchaseDialog?.phoneNumber ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : (
                <CheckIcon className="size-4 mr-2" />
              )}
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Friendly Name Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Friendly Name</DialogTitle>
            <DialogDescription>
              Set a friendly name for {editDialog && formatPhoneNumber(editDialog.phone_number)} to help identify this number.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="friendlyName">Friendly Name</Label>
            <Input
              id="friendlyName"
              placeholder="e.g., Sales Line, Support"
              value={editFriendlyName}
              onChange={(e) => setEditFriendlyName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button onClick={updateFriendlyName} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : (
                <CheckIcon className="size-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
