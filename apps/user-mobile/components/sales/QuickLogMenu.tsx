import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  ActivityType,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_EMOJIS,
  getActivityTypeLabel,
} from "../../lib/types/sales";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH - 32;

interface QuickLogMenuProps {
  onLogActivity: (type: ActivityType) => void;
  onCustomLog?: () => void;
}

interface MenuItemProps {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

function MenuItem({ emoji, title, subtitle, color, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center p-3 active:bg-black/5"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: color + "20" }}
      >
        <Text className="text-lg">{emoji}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-medium text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function QuickLogMenu({ onLogActivity, onCustomLog }: QuickLogMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(fabRotation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  const handleMenuItem = (action: () => void) => {
    closeMenu();
    setTimeout(action, 150);
  };

  const rotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const TAB_BAR_HEIGHT = 83;
  const FAB_BOTTOM = TAB_BAR_HEIGHT + 16;

  const activityTypes: ActivityType[] = ["call", "email", "meeting", "note", "task"];

  const getSubtitle = (type: ActivityType): string => {
    const subtitles: Record<ActivityType, string> = {
      call: "Log a phone conversation",
      email: "Record an email exchange",
      meeting: "Document a meeting",
      note: "Add a quick note",
      task: "Create a follow-up task",
    };
    return subtitles[type];
  };

  const MenuContent = (
    <View className="overflow-hidden rounded-2xl">
      <View className="border-b border-gray-100 px-4 py-3">
        <Text className="text-sm font-semibold text-muted-foreground">
          LOG ACTIVITY
        </Text>
      </View>
      {activityTypes.map((type) => (
        <MenuItem
          key={type}
          emoji={ACTIVITY_TYPE_EMOJIS[type]}
          title={getActivityTypeLabel(type)}
          subtitle={getSubtitle(type)}
          color={ACTIVITY_TYPE_COLORS[type]}
          onPress={() => handleMenuItem(() => onLogActivity(type))}
        />
      ))}
      {onCustomLog && (
        <View className="p-3 pt-2">
          <Pressable
            onPress={() => handleMenuItem(onCustomLog)}
            className="flex-row items-center justify-center rounded-full bg-gray-800 py-3 active:opacity-80"
          >
            <FontAwesome name="plus" size={14} color="white" />
            <Text className="ml-2 text-sm font-semibold text-white">
              Custom Activity
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <>
      {/* FAB Button */}
      <Pressable
        onPress={isOpen ? closeMenu : openMenu}
        style={{ bottom: FAB_BOTTOM }}
        className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-foreground shadow-lg active:opacity-70"
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="add" size={28} color="white" />
        </Animated.View>
      </Pressable>

      {/* Modal with Menu */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View className="flex-1">
          {/* Backdrop */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              opacity: backdropAnim,
            }}
          >
            <Pressable className="flex-1" onPress={closeMenu} />
          </Animated.View>

          {/* Menu Popup */}
          <Animated.View
            style={{
              position: "absolute",
              bottom: FAB_BOTTOM + 70,
              right: 24,
              width: MENU_WIDTH,
              transform: [
                { scale: scaleAnim },
                {
                  translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: opacityAnim,
            }}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={80}
                tint="light"
                style={{
                  borderRadius: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  overflow: "hidden",
                }}
              >
                {MenuContent}
              </BlurView>
            ) : (
              <View
                className="overflow-hidden rounded-2xl bg-white shadow-lg"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                {MenuContent}
              </View>
            )}
          </Animated.View>

          {/* FAB in Modal (to keep it on top) */}
          <Pressable
            onPress={closeMenu}
            style={{
              position: "absolute",
              bottom: FAB_BOTTOM,
              right: 24,
            }}
            className="h-14 w-14 items-center justify-center rounded-full bg-foreground shadow-lg"
          >
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons name="add" size={28} color="white" />
            </Animated.View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
