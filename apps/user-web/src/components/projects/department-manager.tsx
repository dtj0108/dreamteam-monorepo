"use client"

import { useState } from "react"
import { useProjects, type Department } from "@/providers/projects-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash2,
  GripVertical,
  Building2,
  Briefcase,
  Users,
  Folder,
  Target,
  Lightbulb,
  Rocket,
  Shield,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react"

const departmentColors = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
]

const departmentIcons = [
  { name: "building-2", icon: Building2 },
  { name: "briefcase", icon: Briefcase },
  { name: "users", icon: Users },
  { name: "folder", icon: Folder },
  { name: "target", icon: Target },
  { name: "lightbulb", icon: Lightbulb },
  { name: "rocket", icon: Rocket },
  { name: "shield", icon: Shield },
]

interface DepartmentManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DepartmentIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const iconData = departmentIcons.find(i => i.name === name)
  if (!iconData) return <Building2 className={className} style={style} />
  const Icon = iconData.icon
  return <Icon className={className} style={style} />
}

export function DepartmentManager({ open, onOpenChange }: DepartmentManagerProps) {
  const { departments, createDepartment, updateDepartment, deleteDepartment } = useProjects()
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptColor, setNewDeptColor] = useState(departmentColors[0])
  const [newDeptIcon, setNewDeptIcon] = useState("building-2")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editIcon, setEditIcon] = useState("")

  const handleCreate = async () => {
    if (!newDeptName.trim()) return
    setCreating(true)
    try {
      await createDepartment({
        name: newDeptName.trim(),
        color: newDeptColor,
        icon: newDeptIcon,
      })
      setNewDeptName("")
      setNewDeptColor(departmentColors[0])
      setNewDeptIcon("building-2")
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (dept: Department) => {
    setEditingId(dept.id)
    setEditName(dept.name)
    setEditColor(dept.color)
    setEditIcon(dept.icon)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
    setEditIcon("")
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    await updateDepartment(id, {
      name: editName.trim(),
      color: editColor,
      icon: editIcon,
    })
    cancelEditing()
  }

  const handleDelete = async (dept: Department) => {
    if (confirm(`Delete "${dept.name}"? Projects in this department will become uncategorized.`)) {
      await deleteDepartment(dept.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>
            Organize your projects by department. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new department */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">New Department</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering, Marketing..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <div className="flex gap-1 mt-1">
                  {departmentColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        newDeptColor === c && "ring-2 ring-offset-1 ring-primary"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewDeptColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Icon</Label>
                <div className="flex gap-1 mt-1">
                  {departmentIcons.slice(0, 4).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded flex items-center justify-center transition-all",
                        newDeptIcon === item.name
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                      onClick={() => setNewDeptIcon(item.name)}
                    >
                      <item.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!newDeptName.trim() || creating}
              size="sm"
              className="w-full"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Department
            </Button>
          </div>

          {/* Existing departments */}
          <div className="space-y-1">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No departments yet. Create one above.
              </p>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />

                  {editingId === dept.id ? (
                    // Edit mode
                    <>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: editColor + "20" }}
                      >
                        <DepartmentIcon name={editIcon} className="w-4 h-4" style={{ color: editColor }} />
                      </div>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {departmentColors.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn(
                              "w-4 h-4 rounded-full",
                              editColor === c && "ring-1 ring-offset-1 ring-primary"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setEditColor(c)}
                          />
                        ))}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(dept.id)}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: dept.color + "20" }}
                      >
                        <DepartmentIcon name={dept.icon} className="w-4 h-4" style={{ color: dept.color }} />
                      </div>
                      <span className="flex-1 font-medium">{dept.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {dept.project_count || 0} projects
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(dept)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDelete(dept)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
