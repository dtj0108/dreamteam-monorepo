"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2Icon } from "lucide-react"
import {
  A2PBrand,
  CreateBrandInput,
  BUSINESS_TYPE_LABELS,
  INDUSTRY_VERTICAL_LABELS,
  US_STATES,
  BusinessType,
  IndustryVertical,
} from "@/types/a2p"

interface BrandFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand?: A2PBrand
  onSuccess: () => void
}

export function BrandForm({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formData, setFormData] = React.useState<CreateBrandInput>({
    brand_name: "",
    business_type: "llc" as BusinessType,
    ein: "",
    email: "",
    phone: "",
    website: "",
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    vertical: "other" as IndustryVertical,
  })

  React.useEffect(() => {
    if (brand) {
      setFormData({
        brand_name: brand.brand_name,
        business_type: brand.business_type,
        ein: brand.ein || "",
        email: brand.email,
        phone: brand.phone,
        website: brand.website || "",
        street: brand.street,
        city: brand.city,
        state: brand.state,
        postal_code: brand.postal_code,
        country: brand.country,
        vertical: brand.vertical,
      })
    } else {
      setFormData({
        brand_name: "",
        business_type: "llc" as BusinessType,
        ein: "",
        email: "",
        phone: "",
        website: "",
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
        vertical: "other" as IndustryVertical,
      })
    }
    setErrors({})
  }, [brand, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.brand_name.trim()) {
      newErrors.brand_name = "Brand name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^\+1\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be in format +1XXXXXXXXXX"
    }

    if (!formData.street.trim()) {
      newErrors.street = "Street address is required"
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required"
    }

    if (!formData.state) {
      newErrors.state = "State is required"
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "Postal code is required"
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.postal_code)) {
      newErrors.postal_code = "Postal code must be 5 or 9 digits (e.g., 12345 or 12345-6789)"
    }

    if (formData.website && formData.website.trim() && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Website must be a valid URL starting with http:// or https://"
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
      const url = brand
        ? `/api/a2p/brands/${brand.id}`
        : "/api/a2p/brands"
      const method = brand ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save brand")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving brand:", error)
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to save brand",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {brand ? "Edit Brand" : "Register New Brand"}
          </DialogTitle>
          <DialogDescription>
            Enter your business information for A2P 10DLC registration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Brand Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Brand Information</h3>

              <div className="grid gap-2">
                <Label htmlFor="brand_name">Brand Name *</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) =>
                    setFormData({ ...formData, brand_name: e.target.value })
                  }
                  placeholder="ACME Corporation"
                />
                {errors.brand_name && (
                  <p className="text-sm text-red-600">{errors.brand_name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="business_type">Business Type *</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, business_type: value as BusinessType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ein">EIN (Optional)</Label>
                <Input
                  id="ein"
                  value={formData.ein}
                  onChange={(e) =>
                    setFormData({ ...formData, ein: e.target.value })
                  }
                  placeholder="12-3456789"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vertical">Industry *</Label>
                <Select
                  value={formData.vertical}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vertical: value as IndustryVertical })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDUSTRY_VERTICAL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Contact Information</h3>

              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@acme.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+15551234567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://acme.com"
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website}</p>
                )}
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Address</h3>

              <div className="grid gap-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                  placeholder="123 Main St"
                />
                {errors.street && (
                  <p className="text-sm text-red-600">{errors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="San Francisco"
                  />
                  {errors.city && (
                    <p className="text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-sm text-red-600">{errors.state}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="94102"
                />
                {errors.postal_code && (
                  <p className="text-sm text-red-600">{errors.postal_code}</p>
                )}
              </div>
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
            <Button type="submit" disabled={isSubmitting}>
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
