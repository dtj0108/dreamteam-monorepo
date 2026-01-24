// VoiceModeToggle - Button to toggle between text and voice input modes

import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";

interface VoiceModeToggleProps {
  isVoiceMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}

const SIZES = {
  small: { button: 32, icon: 16 },
  medium: { button: 40, icon: 20 },
  large: { button: 48, icon: 24 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VoiceModeToggle({
  isVoiceMode,
  onToggle,
  disabled = false,
  size = "medium",
}: VoiceModeToggleProps) {
  const progress = useSharedValue(isVoiceMode ? 1 : 0);
  const scale = useSharedValue(1);

  // Update animation when mode changes
  progress.value = withSpring(isVoiceMode ? 1 : 0, {
    damping: 15,
    stiffness: 150,
  });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ["rgba(0,0,0,0.05)", Colors.primary]
    );

    return {
      backgroundColor,
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const { button: buttonSize, icon: iconSize } = SIZES[size];

  return (
    <AnimatedPressable
      onPress={onToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name={isVoiceMode ? "mic" : "mic-outline"}
        size={iconSize}
        color={isVoiceMode ? "white" : Colors.foreground}
      />
    </AnimatedPressable>
  );
}
