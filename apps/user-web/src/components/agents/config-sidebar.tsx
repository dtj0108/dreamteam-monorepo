"use client"

import { cn } from "@/lib/utils"
import {
  Paintbrush,
  FileText,
  Calendar,
  Bell,
  Activity,
} from "lucide-react"

export type ConfigSection = "style" | "instructions" | "schedules" | "notifications" | "activity"

interface ConfigSidebarProps {
  activeSection: ConfigSection
  onSectionChange: (section: ConfigSection) => void
}

interface SectionGroup {
  title: string
  items: {
    id: ConfigSection
    label: string
    icon: React.ElementType
  }[]
}

const sectionGroups: SectionGroup[] = [
  {
    title: "Personality",
    items: [
      { id: "style", label: "Style", icon: Paintbrush },
      { id: "instructions", label: "Instructions", icon: FileText },
    ],
  },
  {
    title: "Automation",
    items: [
      { id: "schedules", label: "Schedules", icon: Calendar },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "History",
    items: [
      { id: "activity", label: "Activity", icon: Activity },
    ],
  },
]

export function ConfigSidebar({ activeSection, onSectionChange }: ConfigSidebarProps) {
  return (
    <div className="w-56 border-r bg-muted/30 flex-shrink-0">
      <nav className="p-4 space-y-6">
        {sectionGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                        isActive
                          ? "bg-background text-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
