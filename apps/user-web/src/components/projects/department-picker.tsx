"use client"

import { useProjects } from "@/providers/projects-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Briefcase,
  Users,
  Folder,
  Target,
  Lightbulb,
  Rocket,
  Shield,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "building-2": Building2,
  "briefcase": Briefcase,
  "users": Users,
  "folder": Folder,
  "target": Target,
  "lightbulb": Lightbulb,
  "rocket": Rocket,
  "shield": Shield,
}

function DepartmentIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = iconMap[name] || Building2
  return <Icon className={className} style={style} />
}

interface DepartmentPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}

export function DepartmentPicker({ value, onChange, placeholder = "Select department" }: DepartmentPickerProps) {
  const { departments } = useProjects()

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value ? (
            (() => {
              const dept = departments.find(d => d.id === value)
              if (!dept) return placeholder
              return (
                <div className="flex items-center gap-2">
                  <DepartmentIcon
                    name={dept.icon}
                    className="w-4 h-4"
                    style={{ color: dept.color }}
                  />
                  <span>{dept.name}</span>
                </div>
              )
            })()
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No department</span>
        </SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            <div className="flex items-center gap-2">
              <DepartmentIcon
                name={dept.icon}
                className="w-4 h-4"
                style={{ color: dept.color }}
              />
              <span>{dept.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
