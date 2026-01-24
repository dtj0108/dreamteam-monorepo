import { View, Text, Pressable, Modal } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";

interface PushPermissionModalProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function PushPermissionModal({
  visible,
  onEnable,
  onDismiss,
}: PushPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-background p-6">
          {/* Bell Icon */}
          <View className="mb-4 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FontAwesome name="bell" size={32} color={Colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text className="mb-2 text-center text-xl font-semibold text-foreground">
            Enable Push Notifications
          </Text>

          {/* Description */}
          <Text className="mb-6 text-center text-base text-muted-foreground">
            Get notified about messages, mentions, and task updates
          </Text>

          {/* Enable Button */}
          <Pressable
            className="mb-3 items-center rounded-xl bg-primary py-4 active:opacity-70"
            onPress={onEnable}
          >
            <Text className="text-base font-semibold text-white">
              Enable Notifications
            </Text>
          </Pressable>

          {/* Not Now Button */}
          <Pressable
            className="items-center rounded-xl bg-muted py-4 active:opacity-70"
            onPress={onDismiss}
          >
            <Text className="text-base font-medium text-muted-foreground">
              Not Now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
