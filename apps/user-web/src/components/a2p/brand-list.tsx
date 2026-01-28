"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import {
  A2PBrand,
  STATUS_LABELS,
  STATUS_COLORS,
  BUSINESS_TYPE_LABELS,
} from "@/types/a2p"
import { format } from "date-fns"

interface BrandListProps {
  brands: A2PBrand[]
  onEdit: (brand: A2PBrand) => void
  onDelete: (brandId: string) => void
  isLoading?: boolean
}

export function BrandList({
  brands,
  onEdit,
  onDelete,
  isLoading,
}: BrandListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading brands...</p>
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground mb-2">No brands registered yet</p>
        <p className="text-sm text-muted-foreground">
          Register your business to start sending SMS messages
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {brands.map((brand) => {
        const canEdit = ["draft", "rejected"].includes(brand.status)
        const canDelete = ["draft", "rejected"].includes(brand.status)

        return (
          <Card key={brand.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{brand.brand_name}</h3>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[brand.status]}
                    >
                      {STATUS_LABELS[brand.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Business Type:</span>{" "}
                      {BUSINESS_TYPE_LABELS[brand.business_type]}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {brand.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {brand.phone}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span>{" "}
                      {brand.city}, {brand.state}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(brand.created_at), "MMM d, yyyy")}
                    {brand.approved_at && (
                      <> • Approved {format(new Date(brand.approved_at), "MMM d, yyyy")}</>
                    )}
                  </div>

                  {brand.rejected_reason && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Rejection Reason:</span>{" "}
                        {brand.rejected_reason}
                      </p>
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(brand)}>
                        <PencilIcon className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(brand.id)}
                        className="text-red-600"
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    {!canEdit && !canDelete && (
                      <DropdownMenuItem disabled>
                        No actions available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
