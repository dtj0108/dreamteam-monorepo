import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useProjects, useMyTasks } from "../../../../lib/hooks/useProjects";
import { Project, Task } from "../../../../lib/types/projects";
import { ProjectCard } from "../../../../components/projects/ProjectCard";
import { TaskCard } from "../../../../components/projects/TaskCard";

type SearchTab = "all" | "projects" | "tasks";

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();

  const projects = projectsData?.projects || [];
  const tasks = tasksData?.tasks || [];

  // Filter by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.project?.name.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const isLoading = projectsLoading || tasksLoading;

  const handleRefresh = () => {
    refetchProjects();
    refetchTasks();
  };

  const handleProjectPress = (project: Project) => {
    router.push(`/(main)/projects/${project.id}` as any);
  };

  const handleTaskPress = (task: Task) => {
    if (task.project?.id) {
      router.push(`/(main)/projects/${task.project.id}` as any);
    }
  };

  const totalResults = filteredProjects.length + filteredTasks.length;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">Search</Text>
        <Text className="text-sm text-muted-foreground">
          Find projects and tasks
        </Text>
      </View>

      {/* Search Input */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-3">
          <FontAwesome name="search" size={16} color="#9ca3af" />
          <TextInput
            className="ml-3 flex-1 text-base text-foreground"
            placeholder="Search projects, tasks..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <FontAwesome name="times-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      {searchQuery.length > 0 && (
        <View className="flex-row gap-2 px-4 py-2">
          <Pressable
            className={`rounded-full px-4 py-2 ${activeTab === "all" ? "bg-primary" : "bg-muted"}`}
            onPress={() => setActiveTab("all")}
          >
            <Text
              className={`text-sm font-medium ${activeTab === "all" ? "text-white" : "text-muted-foreground"}`}
            >
              All ({totalResults})
            </Text>
          </Pressable>
          <Pressable
            className={`rounded-full px-4 py-2 ${activeTab === "projects" ? "bg-primary" : "bg-muted"}`}
            onPress={() => setActiveTab("projects")}
          >
            <Text
              className={`text-sm font-medium ${activeTab === "projects" ? "text-white" : "text-muted-foreground"}`}
            >
              Projects ({filteredProjects.length})
            </Text>
          </Pressable>
          <Pressable
            className={`rounded-full px-4 py-2 ${activeTab === "tasks" ? "bg-primary" : "bg-muted"}`}
            onPress={() => setActiveTab("tasks")}
          >
            <Text
              className={`text-sm font-medium ${activeTab === "tasks" ? "text-white" : "text-muted-foreground"}`}
            >
              Tasks ({filteredTasks.length})
            </Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : !searchQuery ? (
        <View className="flex-1 items-center justify-center px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FontAwesome name="search" size={32} color="#9ca3af" />
          </View>
          <Text className="mt-4 text-lg font-medium text-foreground">
            Search for anything
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Find projects, tasks, and more{"\n"}by typing in the search box
          </Text>
        </View>
      ) : totalResults === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <FontAwesome name="search" size={48} color="#d1d5db" />
          <Text className="mt-4 text-lg font-medium text-foreground">
            No results found
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Try a different search term
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
        >
          {/* Projects Section */}
          {(activeTab === "all" || activeTab === "projects") && filteredProjects.length > 0 && (
            <View className="mb-4">
              {activeTab === "all" && (
                <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Projects
                </Text>
              )}
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPress={() => handleProjectPress(project)}
                />
              ))}
            </View>
          )}

          {/* Tasks Section */}
          {(activeTab === "all" || activeTab === "tasks") && filteredTasks.length > 0 && (
            <View>
              {activeTab === "all" && (
                <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Tasks
                </Text>
              )}
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task)}
                  showProject
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
