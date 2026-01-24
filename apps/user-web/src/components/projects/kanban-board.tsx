"use client"

import { useState, useMemo } from "react"
import { useProjects, type Task, type TaskStatus } from "@/providers/projects-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  GripVertical,
  Calendar,
  CheckSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowUpDown,
  Clock,
  Archive,
  MoveRight,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDetailSheet } from "./task-detail-sheet"

// @dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Custom animation config for smooth card transitions
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

type Column = {
  id: TaskStatus
  title: string
  color: string
  glowColor: string
}

const columns: Column[] = [
  { id: "todo", title: "To Do", color: "bg-slate-500", glowColor: "shadow-slate-500/50" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500", glowColor: "shadow-blue-500/50" },
  { id: "review", title: "Review", color: "bg-amber-500", glowColor: "shadow-amber-500/50" },
  { id: "done", title: "Done", color: "bg-emerald-500", glowColor: "shadow-emerald-500/50" },
]

const priorityConfig: Record<string, { bg: string; text: string; border: string; pulse?: boolean }> = {
  low: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700"
  },
  medium: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-600 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800"
  },
  high: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-600 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800"
  },
  urgent: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-600 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    pulse: true
  },
}

// Sortable Task Card Component
interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToColumn: (status: TaskStatus) => void
  isDragging?: boolean
}

function SortableTaskCard({
  task,
  onClick,
  onEdit,
  onDelete,
  onMoveToColumn,
  isDragging
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    animateLayoutChanges,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const assignees = task.task_assignees?.slice(0, 3) || []
  const labels = task.task_labels?.slice(0, 3) || []
  const remainingLabels = (task.task_labels?.length || 0) - 3

  // Calculate subtask progress
  const totalSubtasks = task.subtasks?.length || 0
  const completedSubtasks = task.subtasks?.filter(s => s.status === "done").length || 0
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  const priority = priorityConfig[task.priority]
  const isActuallyDragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl p-4",
        "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md",
        "border border-white/60 dark:border-white/10",
        "shadow-lg shadow-black/[0.03] dark:shadow-black/20",
        "hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/30",
        "hover:bg-white/95 dark:hover:bg-white/[0.12]",
        "transition-all duration-200 ease-out",
        "cursor-pointer",
        isActuallyDragging && "opacity-50 scale-[0.98] rotate-1",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      )}
      onClick={onClick}
    >
      {/* Quick Actions - Top Right */}
      <div className={cn(
        "absolute -top-2 -right-2 flex gap-1",
        "opacity-0 group-hover:opacity-100 transition-all duration-200",
        "translate-y-1 group-hover:translate-y-0"
      )}>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <MoveRight className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {columns.filter(c => c.id !== task.status).map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => onMoveToColumn(col.id)}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", col.color)} />
                Move to {col.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 rounded-lg shadow-md bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-3 left-1.5 p-1 rounded cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-3 pl-4">
        {/* Enhanced Labels */}
        {labels.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {labels.map((tl) => (
              <span
                key={tl.label.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  backgroundColor: `${tl.label.color}20`,
                  color: tl.label.color,
                  border: `1px solid ${tl.label.color}40`
                }}
              >
                {tl.label.name}
              </span>
            ))}
            {remainingLabels > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                +{remainingLabels}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">
          {task.title}
        </p>

        {/* Priority Badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] capitalize font-medium border",
            priority.bg, priority.text, priority.border,
            priority.pulse && "animate-pulse"
          )}
        >
          {task.priority}
        </Badge>

        {/* Subtask Progress Bar */}
        {totalSubtasks > 0 && (
          <div className="space-y-1.5">
            <Progress
              value={progressPercent}
              className={cn(
                "h-1.5 bg-slate-100 dark:bg-slate-800",
                progressPercent === 100 && "[&>div]:bg-emerald-500",
                progressPercent > 0 && progressPercent < 100 && "[&>div]:bg-blue-500",
                progressPercent === 0 && "[&>div]:bg-slate-300"
              )}
            />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
            </div>
          </div>
        )}

        {/* Bottom Row - Due Date & Assignees */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md",
                "bg-slate-50 dark:bg-slate-800/50",
                new Date(task.due_date) < new Date() && task.status !== "done"
                  ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                  : ""
              )}>
                <Calendar className="h-3 w-3" />
                <span className="text-[11px] font-medium">
                  {new Date(task.due_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {assignees.length > 0 && (
            <div className="flex -space-x-2">
              {assignees.map((assignee, index) => (
                <Avatar
                  key={assignee.id || assignee.user?.id || index}
                  className="w-6 h-6 border-2 border-white dark:border-slate-900 ring-0"
                >
                  <AvatarImage src={assignee.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] font-medium bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                    {assignee.user?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Drag Overlay Card (shown while dragging)
function DragOverlayCard({ task }: { task: Task }) {
  const labels = task.task_labels?.slice(0, 3) || []

  return (
    <div className={cn(
      "rounded-xl p-4 w-72",
      "bg-white dark:bg-slate-900 backdrop-blur-md",
      "border border-white/60 dark:border-white/10",
      "shadow-2xl shadow-black/20",
      "rotate-3 scale-105",
      "cursor-grabbing"
    )}>
      <div className="space-y-3 pl-4">
        {labels.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {labels.map((tl) => (
              <span
                key={tl.label.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  backgroundColor: `${tl.label.color}20`,
                  color: tl.label.color,
                }}
              >
                {tl.label.name}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <Badge variant="outline" className="text-[10px] capitalize">
          {task.priority}
        </Badge>
      </div>
    </div>
  )
}

// Empty Column State
function EmptyColumnState({ onAddTask }: { onAddTask: () => void }) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center",
        "border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl",
        "m-2 py-8 px-4",
        "transition-colors hover:border-slate-300 dark:hover:border-slate-600",
        "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
      )}
      onClick={onAddTask}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Plus className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Drop tasks here
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        or click to add
      </p>
    </div>
  )
}

// Animated Drop Placeholder
function DropPlaceholder() {
  return (
    <div
      className={cn(
        "h-24 rounded-xl",
        "border-2 border-dashed border-blue-400 dark:border-blue-500",
        "bg-gradient-to-br from-blue-50/80 to-indigo-50/80",
        "dark:from-blue-900/30 dark:to-indigo-900/30",
        "flex items-center justify-center gap-2",
        "animate-pulse",
        "transition-all duration-200"
      )}
    >
      <ArrowDown className="h-4 w-4 text-blue-500 animate-bounce" />
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        Drop here
      </span>
    </div>
  )
}

// Kanban Column Component
interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onSortByPriority: () => void
  onSortByDueDate: () => void
  isDragOver: boolean
  showPlaceholder: boolean
}

function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onSortByPriority,
  onSortByDueDate,
  isDragOver,
  showPlaceholder,
}: KanbanColumnProps) {
  // Use droppable for proper drop zone detection
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const isDropTarget = isDragOver || isOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-80 shrink-0 rounded-2xl",
        "bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl",
        "border border-white/50 dark:border-white/[0.08]",
        "shadow-xl shadow-black/[0.03] dark:shadow-black/30",
        "transition-all duration-300 ease-out",
        // Enhanced drop zone styling
        isDropTarget && cn(
          "ring-2 ring-blue-400 ring-offset-2 ring-offset-background",
          "bg-gradient-to-b from-blue-50/80 to-blue-100/50",
          "dark:from-blue-900/30 dark:to-blue-800/20",
          "scale-[1.02] shadow-2xl shadow-blue-500/20",
          "border-blue-300 dark:border-blue-600"
        )
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-white/5",
        "transition-colors duration-200",
        isDropTarget && "bg-blue-50/50 dark:bg-blue-900/20"
      )}>
        <div className="flex items-center gap-3">
          {/* Status dot with ping animation on drag */}
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-lg",
              column.color,
              column.glowColor
            )} />
            {isDropTarget && (
              <div className={cn(
                "absolute inset-0 w-3 h-3 rounded-full animate-ping",
                column.color,
                "opacity-75"
              )} />
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            {column.title}
          </h3>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-semibold h-5 min-w-[20px] justify-center",
              "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
              isDropTarget && "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300"
            )}
          >
            {tasks.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onAddTask(column.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSortByPriority}>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort by priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSortByDueDate}>
                <Clock className="mr-2 h-4 w-4" />
                Sort by due date
              </DropdownMenuItem>
              {column.id !== "done" && tasks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Move all to...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {columns.filter(c => c.id !== column.id).map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => tasks.forEach(t => onMoveTask(t.id, col.id))}
                        >
                          <div className={cn("w-2 h-2 rounded-full mr-2", col.color)} />
                          {col.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              {column.id === "done" && tasks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-amber-600">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive completed
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tasks Container */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3 min-h-[200px]">
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Drop Placeholder - shown when dragging over this column */}
            {showPlaceholder && <DropPlaceholder />}

            {tasks.length > 0 ? (
              tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onEdit={(e) => {
                    e.stopPropagation()
                    onEditTask(task)
                  }}
                  onDelete={(e) => {
                    e.stopPropagation()
                    onDeleteTask(task.id)
                  }}
                  onMoveToColumn={(status) => onMoveTask(task.id, status)}
                />
              ))
            ) : !showPlaceholder ? (
              <EmptyColumnState onAddTask={() => onAddTask(column.id)} />
            ) : null}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add Task Footer */}
      <div className="p-2 border-t border-slate-200/50 dark:border-white/5">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground",
            "hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
          )}
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>
    </div>
  )
}

// Main Kanban Board Component
interface KanbanBoardProps {
  projectId: string
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { tasks, members, currentProject, updateTask, deleteTask } = useProjects()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("todo")

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })

    // Sort by position within each column
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position)
    })

    return grouped
  }, [tasks])

  // Find which column a task is in
  const findColumnByTaskId = (taskId: string): TaskStatus | null => {
    for (const [status, columnTasks] of Object.entries(tasksByStatus)) {
      if (columnTasks.some(t => t.id === taskId)) {
        return status as TaskStatus
      }
    }
    return null
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragOverColumn(null)
      return
    }

    // Check if we're over a column or a task
    const overId = over.id as string
    const overColumn = columns.find(c => c.id === overId)

    if (overColumn) {
      setDragOverColumn(overColumn.id)
    } else {
      // We're over a task, find its column
      const taskColumn = findColumnByTaskId(overId)
      if (taskColumn) setDragOverColumn(taskColumn)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    setDragOverColumn(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Determine the target column
    let targetStatus: TaskStatus | null = null

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === overId)
    if (targetColumn) {
      targetStatus = targetColumn.id
    } else {
      // Dropped on another task - find its column
      targetStatus = findColumnByTaskId(overId)
    }

    if (targetStatus && targetStatus !== activeTask.status) {
      await updateTask(projectId, activeId, { status: targetStatus })
    }
  }

  const handleAddTask = (status: TaskStatus) => {
    setCreateTaskStatus(status)
    setShowCreateDialog(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
  }

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(projectId, taskId)
  }

  const handleMoveTask = async (taskId: string, status: TaskStatus) => {
    await updateTask(projectId, taskId, { status })
  }

  const handleSortByPriority = (status: TaskStatus) => {
    // Local sort - could be persisted if needed
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    tasksByStatus[status].sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    )
  }

  const handleSortByDueDate = (status: TaskStatus) => {
    tasksByStatus[status].sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-5 pb-4 px-1 min-h-[600px]">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id]}
                onTaskClick={setSelectedTask}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onSortByPriority={() => handleSortByPriority(column.id)}
                onSortByDueDate={() => handleSortByDueDate(column.id)}
                isDragOver={dragOverColumn === column.id}
                showPlaceholder={dragOverColumn === column.id && activeTask?.status !== column.id}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Drag Overlay - with smooth drop animation */}
        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)", // Slight bounce effect
          }}
        >
          {activeTask ? <DragOverlayCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        defaultStatus={createTaskStatus}
        members={members}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        workspaceId={currentProject?.workspace_id}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        members={members}
      />
    </>
  )
}
