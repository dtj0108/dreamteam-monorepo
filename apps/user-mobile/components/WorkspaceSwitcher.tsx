import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useWorkspace } from "@/providers/workspace-provider";

import { WorkspaceDrawer } from "./WorkspaceDrawer";

export function WorkspaceSwitcher() {
  const { currentWorkspace, isLoading } = useWorkspace();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-row items-center">
        <View className="h-9 w-9 rounded-lg bg-muted" />
        <View className="ml-2 h-4 w-20 rounded bg-muted" />
      </View>
    );
  }

  if (!currentWorkspace) {
    return null;
  }

  // Get first letter for workspace icon
  const initial = currentWorkspace.name.charAt(0).toUpperCase();

  return (
    <>
      <Pressable
        onPress={() => setIsDrawerOpen(true)}
        className="flex-row items-center active:opacity-70"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Text className="text-lg font-bold text-white">{initial}</Text>
        </View>
        <Text
          className="ml-2 text-lg font-semibold text-foreground"
          numberOfLines={1}
        >
          {currentWorkspace.name}
        </Text>
        <FontAwesome
          name="chevron-down"
          size={12}
          color={Colors.mutedForeground}
          style={{ marginLeft: 6 }}
        />
      </Pressable>

      <WorkspaceDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
