"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface AgentCardProps {
  emoji: string
  name: string
  role: string
  description: string
  capabilities: string[]
  price: number
  badge?: "popular" | "new"
  onHire?: () => void
}

export function AgentCard({
  emoji,
  name,
  role,
  description,
  capabilities,
  price,
  badge,
  onHire,
}: AgentCardProps) {
  return (
    <Card className="group relative flex flex-col h-full overflow-hidden hover:shadow-lg transition-all duration-200">
      {badge && (
        <div className="absolute top-3 right-3">
          <Badge
            variant={badge === "popular" ? "default" : "secondary"}
            className={badge === "popular" ? "bg-orange-500 hover:bg-orange-500" : ""}
          >
            {badge === "popular" ? "Popular" : "New"}
          </Badge>
        </div>
      )}

      <div className="p-5 flex-grow">
        {/* Avatar */}
        <div className="size-14 rounded-xl bg-muted flex items-center justify-center mb-4">
          <span className="text-3xl">{emoji}</span>
        </div>

        {/* Name & Role */}
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{role}</p>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">{description}</p>

        {/* Capabilities */}
        <div className="space-y-2">
          {capabilities.map((capability, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{capability}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold">${price}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>
        <Button className="w-full" onClick={onHire}>
          Hire {name}
        </Button>
      </div>
    </Card>
  )
}
