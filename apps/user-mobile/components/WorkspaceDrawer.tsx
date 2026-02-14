import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useWorkspace, Workspace } from "@/providers/workspace-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface WorkspaceDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function WorkspaceDrawer({ visible, onClose }: WorkspaceDrawerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();

  const handleSelectWorkspace = async (workspace: Workspace) => {
    try {
      await switchWorkspace(workspace.id);
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    } finally {
      onClose();
    }
  };

  const handleAddWorkspace = () => {
    onClose();
    // Navigate to add workspace screen (to be implemented)
    // router.push("/add-workspace");
  };

  const handleSettings = () => {
    onClose();
    router.push("/(main)/more/settings");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        {/* Drawer */}
        <BlurView
          intensity={80}
          tint="light"
          style={{
            width: DRAWER_WIDTH,
            flex: 1,
            backgroundColor: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <View
            style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom }}
            className="flex-1"
          >
            {/* Header */}
            <View className="px-4 pb-4">
              <Text className="text-2xl font-bold text-foreground">
                Workspaces
              </Text>
            </View>

            {/* Workspace List */}
            <ScrollView className="flex-1 px-2">
              {workspaces.map((workspace) => (
                <WorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  isSelected={currentWorkspace?.id === workspace.id}
                  onSelect={() => handleSelectWorkspace(workspace)}
                />
              ))}
            </ScrollView>

            {/* Bottom Actions */}
            <View className="border-t border-border px-2 pt-2">
              <ActionRow
                icon="plus"
                label="Add a Workspace"
                onPress={handleAddWorkspace}
              />
              <ActionRow
                icon="cog"
                label="Preferences"
                onPress={handleSettings}
              />
              <ActionRow
                icon="question-circle"
                label="Help"
                onPress={() => {
                  onClose();
                }}
              />
            </View>
          </View>
        </BlurView>

        {/* Backdrop */}
        <Pressable
          onPress={onClose}
          className="flex-1 bg-black/30"
          style={{ minWidth: SCREEN_WIDTH - DRAWER_WIDTH }}
        />
      </View>
    </Modal>
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
      className={`mb-1 flex-row items-center rounded-lg p-3 ${
        isSelected ? "bg-primary/10" : "active:bg-muted"
      }`}
    >
      {/* Workspace Icon */}
      <View
        className={`h-12 w-12 items-center justify-center rounded-xl ${
          isSelected ? "bg-primary" : "bg-muted"
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
      <View className="ml-3 flex-1">
        <Text
          className={`text-base font-semibold ${
            isSelected ? "text-primary" : "text-foreground"
          }`}
          numberOfLines={1}
        >
          {workspace.name}
        </Text>
        {workspace.slug && (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {workspace.slug}
          </Text>
        )}
      </View>

      {/* More Options */}
      <Pressable className="p-2">
        <FontAwesome name="ellipsis-h" size={16} color={Colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

interface ActionRowProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  onPress: () => void;
}

function ActionRow({ icon, label, onPress }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-lg p-3 active:bg-muted"
    >
      <FontAwesome name={icon} size={18} color={Colors.mutedForeground} />
      <Text className="ml-3 text-base text-foreground">{label}</Text>
    </Pressable>
  );
}
