// VoicePersonalityPicker - Bottom sheet for selecting voice personality

import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useEffect } from "react";

import {
  VoicePersonality,
  VoicePersonalityInfo,
  VOICE_PERSONALITIES,
} from "@/lib/types/voice";
import { Colors } from "@/constants/Colors";

interface VoicePersonalityPickerProps {
  visible: boolean;
  currentVoice: VoicePersonality;
  onSelect: (voice: VoicePersonality) => void;
  onClose: () => void;
}

export function VoicePersonalityPicker({
  visible,
  currentVoice,
  onSelect,
  onClose,
}: VoicePersonalityPickerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withSpring(400, { damping: 25, stiffness: 250 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelect = (voice: VoicePersonality) => {
    onSelect(voice);
    onClose();
  };

  const getVoiceIcon = (type: "female" | "male" | "neutral") => {
    switch (type) {
      case "female":
        return "female";
      case "male":
        return "male";
      default:
        return "person";
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>Choose Voice</Text>
          <Text style={styles.subtitle}>
            Select a voice personality for the AI
          </Text>

          {/* Voice options */}
          <View style={styles.optionsContainer}>
            {VOICE_PERSONALITIES.map((personality) => (
              <VoiceOption
                key={personality.id}
                personality={personality}
                isSelected={currentVoice === personality.id}
                onSelect={() => handleSelect(personality.id)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Individual voice option
interface VoiceOptionProps {
  personality: VoicePersonalityInfo;
  isSelected: boolean;
  onSelect: () => void;
}

function VoiceOption({ personality, isSelected, onSelect }: VoiceOptionProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const getIcon = () => {
    switch (personality.type) {
      case "female":
        return "female";
      case "male":
        return "male";
      default:
        return "person";
    }
  };

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.option,
        isSelected && styles.optionSelected,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.optionIcon,
          isSelected && { backgroundColor: Colors.primary },
        ]}
      >
        <Ionicons
          name={getIcon()}
          size={20}
          color={isSelected ? "white" : "#6b7280"}
        />
      </View>

      {/* Info */}
      <View style={styles.optionInfo}>
        <View style={styles.optionHeader}>
          <Text
            style={[
              styles.optionName,
              isSelected && { color: Colors.primary },
            ]}
          >
            {personality.name}
          </Text>
          <Text style={styles.optionTone}>{personality.tone}</Text>
        </View>
        <Text style={styles.optionDescription} numberOfLines={1}>
          {personality.description}
        </Text>
      </View>

      {/* Selected indicator */}
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: `${Colors.primary}08`,
    borderColor: Colors.primary,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  optionTone: {
    fontSize: 12,
    color: "#9ca3af",
  },
  optionDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  selectedIndicator: {
    marginLeft: 8,
  },
});
