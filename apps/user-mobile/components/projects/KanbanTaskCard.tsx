import { View, Text } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Task, TASK_PRIORITY_COLORS } from "../../lib/types/projects";

interface KanbanTaskCardProps {
  task: Task;
}

export function KanbanTaskCard({ task }: KanbanTaskCardProps) {
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
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

  return (
    <View
      className="mb-2 rounded-lg bg-white p-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* Priority indicator */}
      <View className="mb-2 flex-row items-center">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
        {task.priority !== "low" && (
          <Text
            className="ml-1.5 text-xs font-medium"
            style={{ color: priorityColor }}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Text>
        )}
      </View>

      {/* Title */}
      <Text
        className={`text-sm font-semibold ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}
        numberOfLines={2}
      >
        {task.title}
      </Text>

      {/* Footer: Due date and assignees */}
      <View className="mt-2 flex-row items-center justify-between">
        {task.due_date ? (
          <View className="flex-row items-center">
            <FontAwesome
              name="calendar-o"
              size={10}
              color={isOverdue ? "#ef4444" : "#9ca3af"}
            />
            <Text
              className={`ml-1 text-xs ${isOverdue ? "font-medium text-red-500" : "text-muted-foreground"}`}
            >
              {formatDate(task.due_date)}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/* Assignee avatars (if any) */}
        {task.task_assignees && task.task_assignees.length > 0 && (
          <View className="flex-row -space-x-1">
            {task.task_assignees.slice(0, 2).map((assignee, index) => (
              <View
                key={assignee.id}
                className="h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-200"
                style={{ marginLeft: index > 0 ? -4 : 0 }}
              >
                {assignee.user?.avatar_url ? (
                  <Text className="text-[8px] font-medium text-gray-600">
                    {assignee.user.name?.charAt(0) || "?"}
                  </Text>
                ) : (
                  <Text className="text-[8px] font-medium text-gray-600">
                    {assignee.user?.name?.charAt(0) || "?"}
                  </Text>
                )}
              </View>
            ))}
            {task.task_assignees.length > 2 && (
              <View
                className="h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-300"
                style={{ marginLeft: -4 }}
              >
                <Text className="text-[8px] font-medium text-gray-600">
                  +{task.task_assignees.length - 2}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Labels (if any) */}
      {task.task_labels && task.task_labels.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {task.task_labels.slice(0, 3).map((labelAssignment) => (
            <View
              key={labelAssignment.label_id}
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: labelAssignment.label.color + "20" }}
            >
              <Text
                className="text-[10px] font-medium"
                style={{ color: labelAssignment.label.color }}
                numberOfLines={1}
              >
                {labelAssignment.label.name}
              </Text>
            </View>
          ))}
          {task.task_labels.length > 3 && (
            <View className="rounded-full bg-gray-100 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-gray-500">
                +{task.task_labels.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
