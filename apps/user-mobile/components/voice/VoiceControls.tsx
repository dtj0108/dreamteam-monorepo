// VoiceControls - Control bar for voice chat (mute, end, voice picker)

import { View, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { VoicePersonality } from "@/lib/types/voice";
import { Colors } from "@/constants/Colors";

interface VoiceControlsProps {
  isMuted: boolean;
  voice: VoicePersonality;
  onToggleMute: () => void;
  onEndCall: () => void;
  onOpenVoicePicker: () => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VoiceControls({
  isMuted,
  voice,
  onToggleMute,
  onEndCall,
  onOpenVoicePicker,
  disabled = false,
}: VoiceControlsProps) {
  return (
    <View style={styles.container}>
      {/* Mute button */}
      <ControlButton
        icon={isMuted ? "mic-off" : "mic"}
        label={isMuted ? "Unmute" : "Mute"}
        onPress={onToggleMute}
        disabled={disabled}
        isActive={!isMuted}
      />

      {/* End call button */}
      <ControlButton
        icon="call"
        label="End"
        onPress={onEndCall}
        disabled={disabled}
        isDestructive
        size="large"
      />

      {/* Voice picker button */}
      <ControlButton
        icon="person-circle"
        label={voice.charAt(0).toUpperCase() + voice.slice(1)}
        onPress={onOpenVoicePicker}
        disabled={disabled}
      />
    </View>
  );
}

// Individual control button
interface ControlButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isActive?: boolean;
  isDestructive?: boolean;
  size?: "normal" | "large";
}

function ControlButton({
  icon,
  label,
  onPress,
  disabled = false,
  isActive = true,
  isDestructive = false,
  size = "normal",
}: ControlButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonSize = size === "large" ? 64 : 52;
  const iconSize = size === "large" ? 28 : 22;

  const getButtonColors = () => {
    if (isDestructive) {
      return {
        background: "#ef4444",
        icon: "white",
      };
    }
    if (!isActive) {
      return {
        background: "rgba(0,0,0,0.1)",
        icon: "#6b7280",
      };
    }
    return {
      background: "rgba(0,0,0,0.05)",
      icon: Colors.foreground,
    };
  };

  const colors = getButtonColors();

  return (
    <View style={styles.buttonContainer}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          animatedStyle,
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: colors.background,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={colors.icon}
          style={isDestructive ? { transform: [{ rotate: "135deg" }] } : undefined}
        />
      </AnimatedPressable>
      <Text
        style={[
          styles.buttonLabel,
          { color: isDestructive ? "#ef4444" : "#6b7280" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonContainer: {
    alignItems: "center",
    gap: 8,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
