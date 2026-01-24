// VoiceOverlay - Full-screen overlay for active voice chat sessions

import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useEffect, useState } from "react";

import { VoiceStatus, VoicePersonality } from "@/lib/types/voice";
import { VoiceIndicator } from "./VoiceIndicator";
import { VoiceControls } from "./VoiceControls";
import { VoicePersonalityPicker } from "./VoicePersonalityPicker";
import { Colors } from "@/constants/Colors";

interface VoiceOverlayProps {
  visible: boolean;
  agentName?: string;
  agentAvatar?: string;
  status: VoiceStatus;
  inputLevel: number;
  outputLevel: number;
  userTranscript: string;
  assistantTranscript: string;
  isMuted: boolean;
  voice: VoicePersonality;
  onToggleMute: () => void;
  onEndCall: () => void;
  onInterrupt: () => void;
  onChangeVoice: (voice: VoicePersonality) => void;
}

export function VoiceOverlay({
  visible,
  agentName = "AI Assistant",
  agentAvatar,
  status,
  inputLevel,
  outputLevel,
  userTranscript,
  assistantTranscript,
  isMuted,
  voice,
  onToggleMute,
  onEndCall,
  onInterrupt,
  onChangeVoice,
}: VoiceOverlayProps) {
  const insets = useSafeAreaInsets();
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Animated ring around avatar
  const ringRotation = useSharedValue(0);
  const ringScale = useSharedValue(1);

  // Animation based on status
  useEffect(() => {
    if (status === "speaking") {
      // Pulsing ring when AI is speaking
      ringScale.value = withRepeat(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringRotation.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } else if (status === "listening") {
      // Subtle pulse when listening
      ringScale.value = withRepeat(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringRotation.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      ringScale.value = withSpring(1);
    }
  }, [status]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${ringRotation.value}deg` },
      { scale: ringScale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background */}
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.8)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Agent avatar with animated ring */}
        <View style={styles.avatarSection}>
          <Animated.View style={[styles.avatarRing, ringStyle]}>
            <LinearGradient
              colors={[Colors.primary, "#22c55e", Colors.primary]}
              style={styles.avatarRingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <View style={styles.avatarContainer}>
            {agentAvatar ? (
              <Image
                source={{ uri: agentAvatar }}
                style={styles.avatar}
              />
            ) : (
              <LottieView
                source={require("@/ai-sphere-animation.json")}
                autoPlay
                loop
                style={styles.avatarAnimation}
              />
            )}
          </View>

          <Text style={styles.agentName}>{agentName}</Text>
        </View>

        {/* Voice indicator with waveform and transcripts */}
        <View style={styles.indicatorSection}>
          <VoiceIndicator
            status={status}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            userTranscript={userTranscript}
            assistantTranscript={assistantTranscript}
            showTranscripts={true}
          />
        </View>

        {/* Controls */}
        <View style={[styles.controlsSection, { paddingBottom: insets.bottom + 16 }]}>
          <VoiceControls
            isMuted={isMuted}
            voice={voice}
            onToggleMute={onToggleMute}
            onEndCall={onEndCall}
            onOpenVoicePicker={() => setShowVoicePicker(true)}
          />
        </View>
      </View>

      {/* Voice personality picker */}
      <VoicePersonalityPicker
        visible={showVoicePicker}
        currentVoice={voice}
        onSelect={onChangeVoice}
        onClose={() => setShowVoicePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  androidBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  avatarRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarRingGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 80,
    opacity: 0.3,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  avatarAnimation: {
    width: 140,
    height: 140,
  },
  agentName: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  indicatorSection: {
    paddingHorizontal: 20,
  },
  controlsSection: {
    paddingTop: 20,
  },
});
