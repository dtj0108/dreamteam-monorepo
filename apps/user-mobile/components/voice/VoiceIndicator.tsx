// VoiceIndicator - Animated waveform with status and transcripts

import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

import { VoiceStatus } from "@/lib/types/voice";
import { Colors } from "@/constants/Colors";

interface VoiceIndicatorProps {
  status: VoiceStatus;
  inputLevel: number;
  outputLevel: number;
  userTranscript?: string;
  assistantTranscript?: string;
  showTranscripts?: boolean;
}

const BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_GAP = 4;
const MAX_BAR_HEIGHT = 32;
const MIN_BAR_HEIGHT = 8;

export function VoiceIndicator({
  status,
  inputLevel,
  outputLevel,
  userTranscript,
  assistantTranscript,
  showTranscripts = true,
}: VoiceIndicatorProps) {
  // Animation values for each bar
  const barAnimations = Array.from({ length: BAR_COUNT }, () =>
    useSharedValue(0)
  );

  // Pulse animation for connecting state
  const pulseScale = useSharedValue(1);

  // Determine which level to use based on status
  const activeLevel = status === "speaking" ? outputLevel : inputLevel;
  const isActive = status === "listening" || status === "speaking";

  // Animate bars based on audio level
  useEffect(() => {
    if (isActive) {
      barAnimations.forEach((anim, index) => {
        // Add some randomness and offset for natural feel
        const offset = (index - Math.floor(BAR_COUNT / 2)) * 0.1;
        const targetHeight =
          MIN_BAR_HEIGHT +
          (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) *
            Math.max(0, Math.min(1, activeLevel + offset + Math.random() * 0.2));

        anim.value = withSpring(targetHeight, {
          damping: 12,
          stiffness: 200,
        });
      });
    } else {
      // Reset to minimum height when not active
      barAnimations.forEach((anim) => {
        anim.value = withSpring(MIN_BAR_HEIGHT, {
          damping: 15,
          stiffness: 150,
        });
      });
    }
  }, [activeLevel, isActive]);

  // Connecting pulse animation
  useEffect(() => {
    if (status === "connecting" || status === "processing") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Get status text and color
  const getStatusInfo = () => {
    switch (status) {
      case "connecting":
        return { text: "Connecting...", color: Colors.primary };
      case "listening":
        return { text: "Listening", color: "#22c55e" };
      case "processing":
        return { text: "Thinking...", color: Colors.primary };
      case "speaking":
        return { text: "Speaking", color: Colors.primary };
      case "error":
        return { text: "Error", color: "#ef4444" };
      default:
        return { text: "Ready", color: "#9ca3af" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      {/* Waveform visualization */}
      <Animated.View style={[styles.waveformContainer, pulseStyle]}>
        <View style={styles.waveform}>
          {barAnimations.map((anim, index) => (
            <WaveformBar
              key={index}
              animation={anim}
              color={status === "speaking" ? Colors.primary : "#22c55e"}
              isCenter={index === Math.floor(BAR_COUNT / 2)}
            />
          ))}
        </View>
      </Animated.View>

      {/* Status indicator */}
      <View style={styles.statusContainer}>
        <View
          style={[styles.statusDot, { backgroundColor: statusInfo.color }]}
        />
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
      </View>

      {/* Transcripts */}
      {showTranscripts && (
        <View style={styles.transcriptsContainer}>
          {userTranscript ? (
            <View style={styles.transcriptBubble}>
              <Text style={styles.transcriptLabel}>You</Text>
              <Text style={styles.transcriptText} numberOfLines={3}>
                {userTranscript.split("\n").pop()}
              </Text>
            </View>
          ) : null}

          {assistantTranscript ? (
            <View
              style={[styles.transcriptBubble, styles.assistantTranscript]}
            >
              <Text style={[styles.transcriptLabel, { color: Colors.primary }]}>
                AI
              </Text>
              <Text style={styles.transcriptText} numberOfLines={3}>
                {assistantTranscript.split("\n").pop()}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// Individual waveform bar component
function WaveformBar({
  animation,
  color,
  isCenter,
}: {
  animation: SharedValue<number>;
  color: string;
  isCenter: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: animation.value,
    opacity: interpolate(
      animation.value,
      [MIN_BAR_HEIGHT, MAX_BAR_HEIGHT],
      [0.5, 1]
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        {
          backgroundColor: color,
          width: isCenter ? BAR_WIDTH + 2 : BAR_WIDTH,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
  },
  waveformContainer: {
    marginBottom: 16,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: MAX_BAR_HEIGHT + 8,
    gap: BAR_GAP,
  },
  bar: {
    borderRadius: BAR_WIDTH / 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  transcriptsContainer: {
    width: "100%",
    paddingHorizontal: 24,
    gap: 12,
  },
  transcriptBubble: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 16,
    padding: 12,
  },
  assistantTranscript: {
    backgroundColor: `${Colors.primary}10`,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 20,
  },
});
