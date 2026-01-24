import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useProjects } from "../../../../../lib/hooks/useProjects";
import { Project } from "../../../../../lib/types/projects";
import { ProjectCard } from "../../../../../components/projects/ProjectCard";
import { StatsCard } from "../../../../../components/projects/StatsCard";
import { ProductSwitcher } from "../../../../../components/ProductSwitcher";
import { ProjectFABMenu } from "../../../../../components/projects/FABMenu";

export default function ProjectsScreen() {
  const router = useRouter();

  // Fetch data
  const { data: projectsData, isLoading, refetch } = useProjects();
  const projects = projectsData?.projects || [];

  // Calculate stats
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const totalTasks = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
    const totalMembers = new Set(
      projects.flatMap((p) => p.project_members?.map((m) => m.user_id) || [])
    ).size;
    return { total, active, totalTasks, totalMembers };
  }, [projects]);

  // Handlers
  const handleProjectPress = (project: Project) => {
    router.push(`/(main)/projects/${project.id}` as any);
  };

  const handleAddProject = () => {
    router.push("/(main)/projects/(tabs)/(home)/new" as any);
  };

  const handleAddTask = () => {
    // TODO: Navigate to create task screen or show modal
    Alert.alert("Create Task", "Create task functionality coming soon!");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* ProductSwitcher Header */}
      <View className="px-4 pb-2 pt-2">
        <ProductSwitcher />
      </View>

      {/* Stats */}
      <View className="flex-row gap-2 px-4 pb-2">
        <StatsCard label="Total" value={stats.total} icon="folder" iconColor="#6366f1" />
        <StatsCard label="Active" value={stats.active} icon="play" iconColor="#10b981" />
        <StatsCard label="Tasks" value={stats.totalTasks} icon="check-square-o" iconColor="#3b82f6" />
        <StatsCard label="Members" value={stats.totalMembers} icon="users" iconColor="#8b5cf6" />
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
        >
          {projects.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <FontAwesome name="folder-open-o" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No projects yet
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                Create your first project to{"\n"}start managing tasks
              </Text>
              <Pressable
                className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                onPress={handleAddProject}
              >
                <FontAwesome name="plus" size={12} color="white" />
                <Text className="ml-2 font-medium text-white">Create Project</Text>
              </Pressable>
            </View>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onPress={() => handleProjectPress(project)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* FAB Menu */}
      <ProjectFABMenu
        onCreateProject={handleAddProject}
        onCreateTask={handleAddTask}
      />
    </SafeAreaView>
  );
}
