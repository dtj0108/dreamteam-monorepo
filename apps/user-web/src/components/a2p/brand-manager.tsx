"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { A2PBrand } from "@/types/a2p"
import { BrandForm } from "./brand-form"
import { BrandList } from "./brand-list"

export function BrandManager() {
  const [brands, setBrands] = React.useState<A2PBrand[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingBrand, setEditingBrand] = React.useState<A2PBrand | undefined>()
  const [deleteDialog, setDeleteDialog] = React.useState<A2PBrand | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const fetchBrands = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/a2p/brands")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch brands")
      }

      setBrands(data.brands)
    } catch (err) {
      console.error("Error fetching brands:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch brands")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const handleEdit = (brand: A2PBrand) => {
    setEditingBrand(brand)
    setFormOpen(true)
  }

  const handleDelete = async (brandId: string) => {
    const brand = brands.find((b) => b.id === brandId)
    if (brand) {
      setDeleteDialog(brand)
    }
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return

    try {
      const response = await fetch(`/api/a2p/brands/${deleteDialog.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete brand")
      }

      setSuccessMessage("Brand deleted successfully")
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchBrands()
    } catch (err) {
      console.error("Error deleting brand:", err)
      setError(err instanceof Error ? err.message : "Failed to delete brand")
    } finally {
      setDeleteDialog(null)
    }
  }

  const handleManualApprove = async (brandId: string) => {
    try {
      const response = await fetch(`/api/a2p/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", _manualApproval: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve brand")
      }

      setSuccessMessage("Brand approved successfully (testing mode)")
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchBrands()
    } catch (err) {
      console.error("Error approving brand:", err)
      setError(err instanceof Error ? err.message : "Failed to approve brand")
    }
  }

  const handleFormSuccess = () => {
    setEditingBrand(undefined)
    setSuccessMessage(editingBrand ? "Brand updated successfully" : "Brand created successfully")
    setTimeout(() => setSuccessMessage(null), 3000)
    fetchBrands()
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingBrand(undefined)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brand Registrations</CardTitle>
              <CardDescription>
                Register your business for SMS messaging compliance
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingBrand(undefined)
                setFormOpen(true)
              }}
            >
              <PlusIcon className="mr-2 size-4" />
              Register New Brand
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

          {/* Manual Approval Section (Testing Only) */}
          {brands.some((b) => b.status === "draft") && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800 mb-2">
                <span className="font-medium">Testing Mode:</span> You can manually approve draft brands for testing purposes.
                This will be automatic when Twilio API is integrated.
              </p>
              <div className="flex flex-wrap gap-2">
                {brands
                  .filter((b) => b.status === "draft")
                  .map((brand) => (
                    <Button
                      key={brand.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualApprove(brand.id)}
                    >
                      Approve "{brand.brand_name}"
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <BrandList
            brands={brands}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <BrandForm
        open={formOpen}
        onOpenChange={handleFormClose}
        brand={editingBrand}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog?.brand_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
