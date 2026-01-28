"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2Icon, XIcon, PhoneIcon } from "lucide-react"
import { A2PCampaign } from "@/types/a2p"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PhoneNumber {
  id: string
  phone_number: string
  friendly_name: string | null
}

interface AssignedNumber {
  id: string
  phone_number_id: string
  phone_number: PhoneNumber
}

interface CampaignNumberAssignmentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: A2PCampaign
  onSuccess: () => void
}

export function CampaignNumberAssignment({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: CampaignNumberAssignmentProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [assignedNumbers, setAssignedNumbers] = React.useState<AssignedNumber[]>([])
  const [availableNumbers, setAvailableNumbers] = React.useState<PhoneNumber[]>([])
  const [selectedNumbers, setSelectedNumbers] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      fetchNumbers()
    }
  }, [open, campaign.id])

  const fetchNumbers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch assigned numbers
      const assignedResponse = await fetch(
        `/api/a2p/campaigns/${campaign.id}/numbers`
      )
      const assignedData = await assignedResponse.json()

      if (!assignedResponse.ok) {
        throw new Error(assignedData.error || "Failed to fetch assigned numbers")
      }

      setAssignedNumbers(assignedData.numbers || [])

      // Fetch all owned numbers
      const allNumbersResponse = await fetch("/api/twilio/numbers/owned")
      const allNumbersData = await allNumbersResponse.json()

      if (!allNumbersResponse.ok) {
        throw new Error(allNumbersData.error || "Failed to fetch phone numbers")
      }

      // Filter out numbers that are already assigned to ANY campaign
      // We'll need to check each number's assignment status
      const assignedNumberIds = new Set(
        assignedData.numbers.map((n: AssignedNumber) => n.phone_number_id)
      )

      // For simplicity, we'll just filter available numbers by checking if they're in assignedNumbers
      // In a real implementation, you might want to check all campaign assignments
      const available = (allNumbersData.numbers || []).filter(
        (num: PhoneNumber) => !assignedNumberIds.has(num.id)
      )

      setAvailableNumbers(available)
    } catch (err) {
      console.error("Error fetching numbers:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch numbers")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnassign = async (assignmentId: string, phoneNumberId: string) => {
    try {
      const response = await fetch(
        `/api/a2p/campaigns/${campaign.id}/numbers/${phoneNumberId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to unassign number")
      }

      await fetchNumbers()
      onSuccess()
    } catch (err) {
      console.error("Error unassigning number:", err)
      setError(err instanceof Error ? err.message : "Failed to unassign number")
    }
  }

  const handleAssign = async () => {
    if (selectedNumbers.size === 0) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Assign each selected number
      const promises = Array.from(selectedNumbers).map((phoneNumberId) =>
        fetch(`/api/a2p/campaigns/${campaign.id}/numbers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number_id: phoneNumberId }),
        })
      )

      const results = await Promise.all(promises)
      const errors = results
        .filter((r) => !r.ok)
        .map(async (r) => {
          const data = await r.json()
          return data.error
        })

      if (errors.length > 0) {
        const errorMessages = await Promise.all(errors)
        throw new Error(errorMessages.join(", "))
      }

      setSelectedNumbers(new Set())
      await fetchNumbers()
      onSuccess()
    } catch (err) {
      console.error("Error assigning numbers:", err)
      setError(err instanceof Error ? err.message : "Failed to assign numbers")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleNumber = (numberId: string) => {
    const newSelected = new Set(selectedNumbers)
    if (newSelected.has(numberId)) {
      newSelected.delete(numberId)
    } else {
      newSelected.add(numberId)
    }
    setSelectedNumbers(newSelected)
  }

  const formatPhoneNumber = (phoneNumber: string) => {
    // Format +15551234567 as +1 (555) 123-4567
    if (phoneNumber.startsWith("+1") && phoneNumber.length === 12) {
      return `+1 (${phoneNumber.slice(2, 5)}) ${phoneNumber.slice(5, 8)}-${phoneNumber.slice(8)}`
    }
    return phoneNumber
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Phone Numbers</DialogTitle>
          <DialogDescription>
            Assign phone numbers to "{campaign.campaign_name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Currently Assigned Numbers */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Assigned Numbers ({assignedNumbers.length})
                </h4>
                {assignedNumbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
                    No numbers assigned yet
                  </p>
                ) : (
                  <ScrollArea className="h-[150px] rounded-lg border">
                    <div className="p-2 space-y-1">
                      {assignedNumbers.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="size-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {formatPhoneNumber(assignment.phone_number.phone_number)}
                              </div>
                              {assignment.phone_number.friendly_name && (
                                <div className="text-xs text-muted-foreground">
                                  {assignment.phone_number.friendly_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleUnassign(
                                assignment.id,
                                assignment.phone_number_id
                              )
                            }
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Available Numbers */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Available Numbers ({availableNumbers.length})
                </h4>
                {availableNumbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
                    No available numbers. All numbers are assigned or you need to purchase numbers first.
                  </p>
                ) : (
                  <ScrollArea className="h-[200px] rounded-lg border">
                    <div className="p-2 space-y-1">
                      {availableNumbers.map((number) => (
                        <div
                          key={number.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          onClick={() => toggleNumber(number.id)}
                        >
                          <Checkbox
                            checked={selectedNumbers.has(number.id)}
                            onCheckedChange={() => toggleNumber(number.id)}
                          />
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="size-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {formatPhoneNumber(number.phone_number)}
                              </div>
                              {number.friendly_name && (
                                <div className="text-xs text-muted-foreground">
                                  {number.friendly_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {selectedNumbers.size > 0 && (
            <Button onClick={handleAssign} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign ${selectedNumbers.size} ${selectedNumbers.size === 1 ? "Number" : "Numbers"}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
