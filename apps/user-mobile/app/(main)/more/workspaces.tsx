import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useWorkspace, Workspace } from "@/providers/workspace-provider";

export default function WorkspacesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();

  const handleSwitchWorkspace = (workspaceId: string) => {
    // Don't switch if already on this workspace
    if (currentWorkspace?.id === workspaceId) return;

    // Switch workspace context
    switchWorkspace(workspaceId);

    // Invalidate all cached queries (full refresh)
    queryClient.invalidateQueries();

    // Navigate to hub
    router.push("/(main)/hub");
  };

  const handleAddWorkspace = () => {
    // TODO: Navigate to add workspace flow
  };

  const handleJoinWorkspace = () => {
    // TODO: Navigate to join workspace flow
  };

  return (
    <View className="flex-1 bg-background">
      {/* Workspace List */}
      <ScrollView className="flex-1 p-4">
        <Text className="mb-4 text-sm font-medium uppercase text-muted-foreground">
          Your Workspaces
        </Text>

        {workspaces.map((workspace) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            isSelected={currentWorkspace?.id === workspace.id}
            onSelect={() => handleSwitchWorkspace(workspace.id)}
          />
        ))}

        {workspaces.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-muted-foreground">No workspaces found</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View className="border-t border-border p-4">
        <Pressable
          onPress={handleAddWorkspace}
          className="mb-3 flex-row items-center rounded-lg bg-foreground p-4"
        >
          <FontAwesome name="plus" size={18} color="#ffffff" />
          <Text className="ml-3 flex-1 font-semibold text-white">
            Add a Workspace
          </Text>
        </Pressable>

        <Pressable
          onPress={handleJoinWorkspace}
          className="flex-row items-center rounded-lg border border-border bg-background p-4"
        >
          <FontAwesome name="link" size={18} color={Colors.foreground} />
          <Text className="ml-3 flex-1 font-semibold text-foreground">
            Join a Workspace
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface WorkspaceRowProps {
  workspace: Workspace;
  isSelected: boolean;
  onSelect: () => void;
}

function WorkspaceRow({ workspace, isSelected, onSelect }: WorkspaceRowProps) {
  const initial = workspace.name.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onSelect}
      className={`mb-2 flex-row items-center rounded-xl p-4 ${
        isSelected ? "bg-muted" : "bg-card active:bg-muted"
      }`}
    >
      {/* Workspace Initial */}
      <View
        className={`h-12 w-12 items-center justify-center rounded-xl ${
          isSelected ? "bg-foreground" : "bg-muted"
        }`}
      >
        <Text
          className={`text-xl font-bold ${
            isSelected ? "text-white" : "text-foreground"
          }`}
        >
          {initial}
        </Text>
      </View>

      {/* Workspace Info */}
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {workspace.name}
        </Text>
        {workspace.slug && (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {workspace.slug}
          </Text>
        )}
      </View>

      {/* Check mark for selected */}
      {isSelected && (
        <FontAwesome name="check" size={18} color={Colors.foreground} />
      )}
    </Pressable>
  );
}
