import { View, Text, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Task, TASK_PRIORITY_COLORS, getTaskPriorityLabel } from "../../lib/types/projects";

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onLongPress?: () => void;
  showProject?: boolean; // Show project name (for My Tasks view)
}

export function TaskCard({ task, onPress, onLongPress, showProject = false }: TaskCardProps) {
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Check if task is overdue
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  const priorityColor = TASK_PRIORITY_COLORS[task.priority];

  // Build subtitle parts (like ProjectCard)
  const subtitleParts: string[] = [];

  if (showProject && task.project) {
    subtitleParts.push(task.project.name);
  }

  // Add priority if not low (default)
  if (task.priority !== "low") {
    subtitleParts.push(getTaskPriorityLabel(task.priority));
  }

  // Add due date
  if (task.due_date) {
    const dateStr = formatDate(task.due_date);
    if (dateStr) {
      subtitleParts.push(`Due ${dateStr}`);
    }
  }

  // If no subtitle parts, show status
  if (subtitleParts.length === 0) {
    subtitleParts.push(task.status === "done" ? "Completed" : "To do");
  }

  const subtitle = subtitleParts.join(" · ");

  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl bg-muted p-3 active:opacity-70"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {/* Icon */}
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-background">
        <FontAwesome
          name={task.status === "done" ? "check-square" : "square-o"}
          size={16}
          color={priorityColor}
        />
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text
          className={`font-semibold ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <Text
          className={`text-sm ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {/* Chevron */}
      <FontAwesome
        name="chevron-right"
        size={12}
        color="#9ca3af"
        style={{ marginLeft: 8 }}
      />
    </Pressable>
  );
}
