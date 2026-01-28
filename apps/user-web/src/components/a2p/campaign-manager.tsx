"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { PlusIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react"
import { A2PBrand, A2PCampaignWithBrand } from "@/types/a2p"
import { CampaignForm } from "./campaign-form"
import { CampaignList } from "./campaign-list"
import { CampaignNumberAssignment } from "./campaign-number-assignment"

export function CampaignManager() {
  const [campaigns, setCampaigns] = React.useState<A2PCampaignWithBrand[]>([])
  const [brands, setBrands] = React.useState<A2PBrand[]>([])
  const [phoneNumberCounts, setPhoneNumberCounts] = React.useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingCampaign, setEditingCampaign] = React.useState<
    A2PCampaignWithBrand | undefined
  >()
  const [deleteDialog, setDeleteDialog] = React.useState<A2PCampaignWithBrand | null>(
    null
  )
  const [numberAssignmentDialog, setNumberAssignmentDialog] = React.useState<
    A2PCampaignWithBrand | null
  >(null)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const fetchBrands = React.useCallback(async () => {
    try {
      const response = await fetch("/api/a2p/brands")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch brands")
      }

      setBrands(data.brands)
    } catch (err) {
      console.error("Error fetching brands:", err)
    }
  }, [])

  const fetchCampaigns = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/a2p/campaigns")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch campaigns")
      }

      setCampaigns(data.campaigns)

      // Fetch phone number counts for each campaign
      const counts: Record<string, number> = {}
      await Promise.all(
        data.campaigns.map(async (campaign: A2PCampaignWithBrand) => {
          try {
            const numbersResponse = await fetch(
              `/api/a2p/campaigns/${campaign.id}/numbers`
            )
            const numbersData = await numbersResponse.json()
            counts[campaign.id] = numbersData.numbers?.length || 0
          } catch {
            counts[campaign.id] = 0
          }
        })
      )
      setPhoneNumberCounts(counts)
    } catch (err) {
      console.error("Error fetching campaigns:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch campaigns")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchBrands()
    fetchCampaigns()
  }, [fetchBrands, fetchCampaigns])

  const handleEdit = (campaign: A2PCampaignWithBrand) => {
    setEditingCampaign(campaign)
    setFormOpen(true)
  }

  const handleDelete = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (campaign) {
      setDeleteDialog(campaign)
    }
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return

    try {
      const response = await fetch(`/api/a2p/campaigns/${deleteDialog.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete campaign")
      }

      setSuccessMessage("Campaign deleted successfully")
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchCampaigns()
    } catch (err) {
      console.error("Error deleting campaign:", err)
      setError(err instanceof Error ? err.message : "Failed to delete campaign")
    } finally {
      setDeleteDialog(null)
    }
  }

  const handleManualApprove = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/a2p/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", _manualApproval: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve campaign")
      }

      setSuccessMessage("Campaign approved successfully (testing mode)")
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchCampaigns()
    } catch (err) {
      console.error("Error approving campaign:", err)
      setError(err instanceof Error ? err.message : "Failed to approve campaign")
    }
  }

  const handleManageNumbers = (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (campaign) {
      setNumberAssignmentDialog(campaign)
    }
  }

  const handleFormSuccess = () => {
    setEditingCampaign(undefined)
    setSuccessMessage(
      editingCampaign ? "Campaign updated successfully" : "Campaign created successfully"
    )
    setTimeout(() => setSuccessMessage(null), 3000)
    fetchCampaigns()
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingCampaign(undefined)
  }

  const approvedBrands = brands.filter((b) => b.status === "approved" || b.status === "draft")
  const hasNoBrands = brands.length === 0
  const hasNoApprovedBrands = approvedBrands.length === 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messaging Campaigns</CardTitle>
              <CardDescription>
                Configure your SMS messaging campaigns and use cases
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingCampaign(undefined)
                setFormOpen(true)
              }}
              disabled={hasNoApprovedBrands}
            >
              <PlusIcon className="mr-2 size-4" />
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <CheckCircleIcon className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-700"
              >
                ×
              </button>
            </div>
          )}

          {hasNoBrands && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                You must register a brand before creating campaigns. Go to the Brand Registration tab to get started.
              </p>
            </div>
          )}

          {!hasNoBrands && hasNoApprovedBrands && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                You must have an approved brand before creating campaigns. Your brands are currently in draft or pending status.
              </p>
            </div>
          )}

          {/* Manual Approval Section (Testing Only) */}
          {campaigns.some((c) => c.status === "draft") && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800 mb-2">
                <span className="font-medium">Testing Mode:</span> You can manually approve draft campaigns for testing purposes.
                This will be automatic when Twilio API is integrated.
              </p>
              <div className="flex flex-wrap gap-2">
                {campaigns
                  .filter((c) => c.status === "draft")
                  .map((campaign) => (
                    <Button
                      key={campaign.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualApprove(campaign.id)}
                    >
                      Approve "{campaign.campaign_name}"
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <CampaignList
            campaigns={campaigns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onManageNumbers={handleManageNumbers}
            isLoading={isLoading}
            phoneNumberCounts={phoneNumberCounts}
          />
        </CardContent>
      </Card>

      <CampaignForm
        open={formOpen}
        onOpenChange={handleFormClose}
        brands={approvedBrands}
        campaign={editingCampaign}
        onSuccess={handleFormSuccess}
      />

      {numberAssignmentDialog && (
        <CampaignNumberAssignment
          open={!!numberAssignmentDialog}
          onOpenChange={(open) => {
            if (!open) setNumberAssignmentDialog(null)
          }}
          campaign={numberAssignmentDialog}
          onSuccess={() => {
            setSuccessMessage("Phone number assignments updated")
            setTimeout(() => setSuccessMessage(null), 3000)
            fetchCampaigns()
          }}
        />
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog?.campaign_name}"? This will also unassign all phone numbers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
