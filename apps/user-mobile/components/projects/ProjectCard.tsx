import { View, Text, Pressable } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Project, getProjectStatusLabel } from "../../lib/types/projects";

interface ProjectCardProps {
  project: Project;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ProjectCard({ project, onPress, onLongPress }: ProjectCardProps) {
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Check if project is overdue
  const isOverdue =
    project.target_end_date &&
    new Date(project.target_end_date) < new Date() &&
    project.status !== "completed" &&
    project.status !== "archived";

  // Build subtitle parts
  const subtitleParts: string[] = [];

  if (project.totalTasks !== undefined && project.totalTasks > 0) {
    subtitleParts.push(`${project.completedTasks || 0}/${project.totalTasks} tasks`);
  }

  if (project.target_end_date) {
    subtitleParts.push(`Due ${formatDate(project.target_end_date)}`);
  }

  // If no tasks or due date, show status
  if (subtitleParts.length === 0) {
    subtitleParts.push(getProjectStatusLabel(project.status));
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
      <View
        className="h-10 w-10 items-center justify-center rounded-lg bg-background"
      >
        <FontAwesome name="folder" size={16} color={project.color} />
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {project.name}
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
