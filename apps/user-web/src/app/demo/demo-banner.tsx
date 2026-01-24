"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, DollarSign, Users, MessageSquare, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DemoBanner() {
  const pathname = usePathname()

  // Determine current product based on route
  const getProductInfo = () => {
    if (pathname.startsWith("/demo/agents")) {
      return {
        name: "Dream Team",
        description: "Exploring the Dream Team Agents",
        icon: Users,
        color: "bg-blue-600",
        ctaText: "View Pricing",
        ctaHref: "/pricing",
        secondaryText: "See Workspace",
        secondaryHref: "/demo",
      }
    }
    if (pathname.startsWith("/demo/sales")) {
      return {
        name: "Sales CRM",
        description: "Exploring Acme Corp's CRM with sample data",
        icon: Users,
        color: "from-emerald-600 to-emerald-500",
        secondaryText: "Show Agent Demo",
        secondaryHref: "/demo/agents",
      }
    }
    if (pathname.startsWith("/demo/team")) {
      return {
        name: "Team",
        description: "Exploring CloudSync's team collaboration with sample data",
        icon: MessageSquare,
        color: "from-orange-600 to-orange-500",
        secondaryText: "Show Agent Demo",
        secondaryHref: "/demo/agents",
      }
    }
    if (pathname.startsWith("/demo/knowledge")) {
      return {
        name: "Knowledge",
        description: "Exploring Acme's docs and wiki with sample data",
        icon: BookOpen,
        color: "from-purple-600 to-purple-500",
        secondaryText: "Show Agent Demo",
        secondaryHref: "/demo/agents",
      }
    }
    // Default to Finance
    return {
      name: "Finance",
      description: "Exploring CloudSync's financials with sample data",
      icon: DollarSign,
      color: "from-blue-600 to-blue-500",
      secondaryText: "Show Agent Demo",
      secondaryHref: "/demo/agents",
    }
  }

  const product = getProductInfo()
  const Icon = product.icon

  return (
    <>
      {/* Demo Mode Banner */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${product.color.startsWith("from-") ? "bg-gradient-to-r" : ""} ${product.color} text-white px-4 py-2`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
              <Icon className="h-3 w-3" />
              Demo Mode
            </span>
            <span className="text-sm hidden sm:inline">
              {product.description}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {product.secondaryText && product.secondaryHref && (
              <Link href={product.secondaryHref}>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                  {product.secondaryText}
                </Button>
              </Link>
            )}
            <Link href={product.ctaHref || "/pricing"}>
              <Button size="sm" variant="secondary" className="bg-white text-gray-900 hover:bg-white/90">
                {product.ctaText || "Start Free Trial"}
              </Button>
            </Link>
            <Link href="/" className="text-white/80 hover:text-white transition-colors">
              <X className="h-5 w-5" />
              <span className="sr-only">Exit Demo</span>
            </Link>
          </div>
        </div>
      </div>
      {/* Spacer for fixed banner */}
      <div className="h-10" />
    </>
  )
}
