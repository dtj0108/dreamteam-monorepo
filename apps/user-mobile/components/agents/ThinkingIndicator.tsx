import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";

import { Colors } from "@/constants/Colors";

// Thinking phrases by department
const THINKING_PHRASES: Record<string, string[]> = {
  default: [
    "Thinking...",
    "Processing...",
    "Working on it...",
    "Let me think...",
    "Analyzing...",
  ],
  finance: [
    "Crunching the numbers...",
    "Analyzing financials...",
    "Reviewing the data...",
    "Calculating...",
    "Processing figures...",
  ],
  sales: [
    "Reviewing your pipeline...",
    "Looking at your deals...",
    "Checking the CRM...",
    "Analyzing prospects...",
    "Reviewing contacts...",
  ],
  projects: [
    "Checking your tasks...",
    "Reviewing progress...",
    "Looking at milestones...",
    "Analyzing the project...",
    "Checking timelines...",
  ],
  team: [
    "Checking messages...",
    "Looking at discussions...",
    "Reviewing the team...",
    "Checking channels...",
  ],
  knowledge: [
    "Searching docs...",
    "Looking through knowledge...",
    "Finding information...",
    "Reviewing documents...",
  ],
};

interface ThinkingIndicatorProps {
  agentName?: string;
  department?: string;
  size?: "compact" | "default";
  color?: string;
}

export function ThinkingIndicator({
  agentName,
  department,
  size = "default",
  color = Colors.primary,
}: ThinkingIndicatorProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Get phrases for department (normalized to lowercase)
  const normalizedDept = department?.toLowerCase() || "default";
  const phrases = THINKING_PHRASES[normalizedDept] || THINKING_PHRASES.default;

  // Rotate phrases every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change phrase
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [phrases.length, fadeAnim]);

  // Pulsing dot animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const dotScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const dotOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  if (size === "compact") {
    return (
      <View className="flex-row items-center py-2">
        {/* Pulsing dot */}
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            transform: [{ scale: dotScale }],
            opacity: dotOpacity,
          }}
        />
        {/* Rotating text */}
        <Animated.Text
          className="ml-2 text-sm"
          style={{ color, opacity: fadeAnim }}
        >
          {phrases[phraseIndex]}
        </Animated.Text>
      </View>
    );
  }

  // Default size - more prominent
  return (
    <View className="items-center py-4">
      {/* Pulsing dot */}
      <Animated.View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
          transform: [{ scale: dotScale }],
          opacity: dotOpacity,
          marginBottom: 8,
        }}
      />
      {/* Rotating text */}
      <Animated.Text
        className="text-base font-medium"
        style={{ color, opacity: fadeAnim }}
      >
        {phrases[phraseIndex]}
      </Animated.Text>
    </View>
  );
}

// Separate component for just the text (used in header)
interface ThinkingTextProps {
  agentName?: string;
  department?: string;
  color?: string;
}

export function ThinkingText({
  agentName,
  department,
  color = Colors.primary,
}: ThinkingTextProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const normalizedDept = department?.toLowerCase() || "default";
  const phrases = THINKING_PHRASES[normalizedDept] || THINKING_PHRASES.default;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [phrases.length, fadeAnim]);

  return (
    <Animated.Text
      className="ml-2 text-xs"
      style={{ color, opacity: fadeAnim }}
    >
      {phrases[phraseIndex]}
    </Animated.Text>
  );
}
