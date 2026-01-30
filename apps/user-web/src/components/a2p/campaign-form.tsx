"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react"
import {
  A2PBrand,
  A2PCampaign,
  CreateCampaignInput,
  CAMPAIGN_USE_CASE_LABELS,
  CampaignUseCase,
  DEFAULT_HELP_MESSAGE,
  DEFAULT_OPT_OUT_MESSAGE,
  DEFAULT_OPT_IN_KEYWORDS,
  DEFAULT_OPT_OUT_KEYWORDS,
  DEFAULT_HELP_KEYWORDS,
} from "@/types/a2p"

interface CampaignFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brands: A2PBrand[]
  campaign?: A2PCampaign
  onSuccess: () => void
}

export function CampaignForm({
  open,
  onOpenChange,
  brands,
  campaign,
  onSuccess,
}: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formData, setFormData] = React.useState<CreateCampaignInput>({
    brand_id: "",
    campaign_name: "",
    use_case: "customer_care" as CampaignUseCase,
    sub_use_case: "",
    message_samples: ["", "", ""],
    opt_in_workflow: "",
    opt_in_keywords: DEFAULT_OPT_IN_KEYWORDS,
    opt_out_keywords: DEFAULT_OPT_OUT_KEYWORDS,
    help_keywords: DEFAULT_HELP_KEYWORDS,
    help_message: DEFAULT_HELP_MESSAGE,
    opt_out_message: DEFAULT_OPT_OUT_MESSAGE,
    direct_lending: false,
    embedded_link: false,
    embedded_phone: false,
    age_gated: false,
    affiliate_marketing: false,
    expected_monthly_volume: 1000,
  })

  React.useEffect(() => {
    if (campaign) {
      setFormData({
        brand_id: campaign.brand_id,
        campaign_name: campaign.campaign_name,
        use_case: campaign.use_case,
        sub_use_case: campaign.sub_use_case || "",
        message_samples: campaign.message_samples,
        opt_in_workflow: campaign.opt_in_workflow,
        opt_in_keywords: campaign.opt_in_keywords,
        opt_out_keywords: campaign.opt_out_keywords,
        help_keywords: campaign.help_keywords,
        help_message: campaign.help_message,
        opt_out_message: campaign.opt_out_message,
        direct_lending: campaign.direct_lending,
        embedded_link: campaign.embedded_link,
        embedded_phone: campaign.embedded_phone,
        age_gated: campaign.age_gated,
        affiliate_marketing: campaign.affiliate_marketing,
        expected_monthly_volume: campaign.expected_monthly_volume,
      })
    } else {
      setFormData({
        brand_id: brands.length > 0 ? brands[0].id : "",
        campaign_name: "",
        use_case: "customer_care" as CampaignUseCase,
        sub_use_case: "",
        message_samples: ["", "", ""],
        opt_in_workflow: "",
        opt_in_keywords: DEFAULT_OPT_IN_KEYWORDS,
        opt_out_keywords: DEFAULT_OPT_OUT_KEYWORDS,
        help_keywords: DEFAULT_HELP_KEYWORDS,
        help_message: DEFAULT_HELP_MESSAGE,
        opt_out_message: DEFAULT_OPT_OUT_MESSAGE,
        direct_lending: false,
        embedded_link: false,
        embedded_phone: false,
        age_gated: false,
        affiliate_marketing: false,
        expected_monthly_volume: 1000,
      })
    }
    setErrors({})
  }, [campaign, brands, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.brand_id) {
      newErrors.brand_id = "Brand is required"
    }

    if (!formData.campaign_name.trim()) {
      newErrors.campaign_name = "Campaign name is required"
    }

    const validSamples = formData.message_samples.filter((s) => s.trim())
    if (validSamples.length < 3) {
      newErrors.message_samples = "At least 3 message samples are required"
    } else if (validSamples.length > 5) {
      newErrors.message_samples = "Maximum 5 message samples allowed"
    }

    if (!formData.opt_in_workflow.trim()) {
      newErrors.opt_in_workflow = "Opt-in workflow description is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Filter out empty message samples
      const cleanedData = {
        ...formData,
        message_samples: formData.message_samples.filter((s) => s.trim()),
      }

      const url = campaign
        ? `/api/a2p/campaigns/${campaign.id}`
        : "/api/a2p/campaigns"
      const method = campaign ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save campaign")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving campaign:", error)
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to save campaign",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addMessageSample = () => {
    if (formData.message_samples.length < 5) {
      setFormData({
        ...formData,
        message_samples: [...formData.message_samples, ""],
      })
    }
  }

  const removeMessageSample = (index: number) => {
    if (formData.message_samples.length > 3) {
      setFormData({
        ...formData,
        message_samples: formData.message_samples.filter((_, i) => i !== index),
      })
    }
  }

  const updateMessageSample = (index: number, value: string) => {
    const newSamples = [...formData.message_samples]
    newSamples[index] = value
    setFormData({ ...formData, message_samples: newSamples })
  }

  const approvedBrands = brands.filter((b) => b.status === "approved" || b.status === "draft")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            Configure your messaging campaign for A2P 10DLC compliance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Campaign Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Campaign Information</h3>

              <div className="grid gap-2">
                <Label htmlFor="brand_id">Brand *</Label>
                <Select
                  value={formData.brand_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, brand_id: value })
                  }
                  disabled={!!campaign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedBrands.length === 0 ? (
                      <SelectItem value="" disabled>
                        No approved brands available
                      </SelectItem>
                    ) : (
                      approvedBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.brand_name} ({brand.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.brand_id && (
                  <p className="text-sm text-red-600">{errors.brand_id}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="campaign_name">Campaign Name *</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) =>
                    setFormData({ ...formData, campaign_name: e.target.value })
                  }
                  placeholder="Customer Support Campaign"
                />
                {errors.campaign_name && (
                  <p className="text-sm text-red-600">{errors.campaign_name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="use_case">Use Case *</Label>
                <Select
                  value={formData.use_case}
                  onValueChange={(value) =>
                    setFormData({ ...formData, use_case: value as CampaignUseCase })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_USE_CASE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message Samples */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Message Samples (3-5 required) *</Label>
                {formData.message_samples.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMessageSample}
                  >
                    <PlusIcon className="mr-2 size-3" />
                    Add Sample
                  </Button>
                )}
              </div>
              {formData.message_samples.map((sample, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={sample}
                    onChange={(e) => updateMessageSample(index, e.target.value)}
                    placeholder={`Message sample ${index + 1}`}
                    rows={2}
                    maxLength={160}
                    className="flex-1"
                  />
                  {formData.message_samples.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMessageSample(index)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {errors.message_samples && (
                <p className="text-sm text-red-600">{errors.message_samples}</p>
              )}
            </div>

            {/* Opt-in/Opt-out Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Opt-in/Opt-out Configuration</h3>

              <div className="grid gap-2">
                <Label htmlFor="opt_in_workflow">Opt-in Workflow Description *</Label>
                <Textarea
                  id="opt_in_workflow"
                  value={formData.opt_in_workflow}
                  onChange={(e) =>
                    setFormData({ ...formData, opt_in_workflow: e.target.value })
                  }
                  placeholder="Describe how users consent to receive messages..."
                  rows={3}
                />
                {errors.opt_in_workflow && (
                  <p className="text-sm text-red-600">{errors.opt_in_workflow}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="help_message">Help Message</Label>
                <Textarea
                  id="help_message"
                  value={formData.help_message}
                  onChange={(e) =>
                    setFormData({ ...formData, help_message: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="opt_out_message">Opt-out Message</Label>
                <Textarea
                  id="opt_out_message"
                  value={formData.opt_out_message}
                  onChange={(e) =>
                    setFormData({ ...formData, opt_out_message: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>

            {/* Compliance Attributes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Compliance Attributes</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="embedded_link"
                    checked={formData.embedded_link}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, embedded_link: checked as boolean })
                    }
                  />
                  <Label htmlFor="embedded_link" className="font-normal">
                    Messages contain embedded links
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="embedded_phone"
                    checked={formData.embedded_phone}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, embedded_phone: checked as boolean })
                    }
                  />
                  <Label htmlFor="embedded_phone" className="font-normal">
                    Messages contain embedded phone numbers
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="age_gated"
                    checked={formData.age_gated}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, age_gated: checked as boolean })
                    }
                  />
                  <Label htmlFor="age_gated" className="font-normal">
                    Age-gated content (18+)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="direct_lending"
                    checked={formData.direct_lending}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, direct_lending: checked as boolean })
                    }
                  />
                  <Label htmlFor="direct_lending" className="font-normal">
                    Direct lending or loan arrangements
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="affiliate_marketing"
                    checked={formData.affiliate_marketing}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, affiliate_marketing: checked as boolean })
                    }
                  />
                  <Label htmlFor="affiliate_marketing" className="font-normal">
                    Affiliate marketing
                  </Label>
                </div>
              </div>
            </div>

            {/* Volume Estimate */}
            <div className="grid gap-2">
              <Label htmlFor="expected_monthly_volume">Expected Monthly Message Volume</Label>
              <Input
                id="expected_monthly_volume"
                type="number"
                min="1"
                max="10000000"
                value={formData.expected_monthly_volume}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expected_monthly_volume: parseInt(e.target.value) || 1000,
                  })
                }
              />
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || approvedBrands.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
