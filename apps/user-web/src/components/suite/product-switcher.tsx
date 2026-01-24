"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  DollarSignIcon, 
  UsersIcon, 
  MessageSquareIcon,
  ChevronDownIcon,
  CheckIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const products = [
  {
    id: "finance",
    name: "Finance",
    description: "Financial management",
    href: "/",
    icon: DollarSignIcon,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "crm",
    name: "CRM",
    description: "Customer relationships",
    href: "/crm",
    icon: UsersIcon,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "messaging",
    name: "Messaging",
    description: "Team communication",
    href: "/messaging",
    icon: MessageSquareIcon,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
]

export function ProductSwitcher() {
  const pathname = usePathname()
  
  // Determine current product based on pathname
  const currentProduct = React.useMemo(() => {
    if (pathname.startsWith("/crm")) return products.find(p => p.id === "crm")!
    if (pathname.startsWith("/messaging")) return products.find(p => p.id === "messaging")!
    return products.find(p => p.id === "finance")!
  }, [pathname])

  const CurrentIcon = currentProduct.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <div className={cn("size-6 rounded-md flex items-center justify-center", currentProduct.bgColor)}>
            <CurrentIcon className={cn("size-4", currentProduct.color)} />
          </div>
          <span className="font-semibold">{currentProduct.name}</span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {products.map((product) => {
          const Icon = product.icon
          const isActive = product.id === currentProduct.id
          return (
            <DropdownMenuItem key={product.id} asChild>
              <Link href={product.href} className="flex items-center gap-3 cursor-pointer">
                <div className={cn("size-8 rounded-md flex items-center justify-center", product.bgColor)}>
                  <Icon className={cn("size-4", product.color)} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.description}</div>
                </div>
                {isActive && <CheckIcon className="size-4 text-primary" />}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

