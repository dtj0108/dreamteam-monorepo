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
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

interface FABMenuProps {
  onCreateChannel: () => void;
  onStartDM: () => void;
  onStartHuddle?: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, title, subtitle, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center p-4 active:bg-black/5"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        {icon}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function FABMenu({
  onCreateChannel,
  onStartDM,
  onStartHuddle,
}: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // Animation values
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
    // Small delay to let animation complete
    setTimeout(action, 150);
  };

  const rotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Positioning - FAB above tab bar
  const TAB_BAR_HEIGHT = 83;
  const FAB_BOTTOM = TAB_BAR_HEIGHT + 16;

  const MenuContent = (
    <View className="overflow-hidden rounded-2xl">
      <MenuItem
        icon={<Ionicons name="headset-outline" size={24} color="#64748b" />}
        title="Huddle"
        subtitle="Start an audio or video chat"
        onPress={() => handleMenuItem(onStartHuddle || (() => {}))}
      />
      <View className="mx-4 h-px bg-gray-200" />
      <MenuItem
        icon={
          <Text className="text-xl font-bold text-gray-500">#</Text>
        }
        title="Channel"
        subtitle="Organize teams and work"
        onPress={() => handleMenuItem(onCreateChannel)}
      />
      <View className="p-4 pt-2">
        <Pressable
          onPress={() => handleMenuItem(onStartDM)}
          className="flex-row items-center justify-center rounded-full bg-gray-800 py-3.5 active:opacity-80"
        >
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="ml-2 text-base font-semibold text-white">
            Message
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      {/* FAB Button */}
      <Pressable
        onPress={isOpen ? closeMenu : openMenu}
        style={{ bottom: FAB_BOTTOM }}
        className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-gray-800 shadow-lg active:opacity-70"
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
              bottom: FAB_BOTTOM + 70, // Above FAB
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
            className="h-14 w-14 items-center justify-center rounded-full bg-gray-800 shadow-lg"
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

