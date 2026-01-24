import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeeting } from "@/providers/meeting-provider";

interface MeetingControlsProps {
  onLeave: () => void;
}

export function MeetingControls({ onLeave }: MeetingControlsProps) {
  const insets = useSafeAreaInsets();
  const {
    isAudioMuted,
    isVideoOn,
    toggleAudio,
    toggleVideo,
    switchCamera,
    leaveMeeting,
  } = useMeeting();

  const handleLeave = async () => {
    await leaveMeeting();
    onLeave();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.controls}>
        {/* Mute Button */}
        <Pressable
          onPress={toggleAudio}
          style={[
            styles.controlButton,
            isAudioMuted && styles.controlButtonOff,
          ]}
        >
          <Ionicons
            name={isAudioMuted ? "mic-off" : "mic"}
            size={24}
            color={isAudioMuted ? "#ef4444" : "#fff"}
          />
        </Pressable>

        {/* Video Button */}
        <Pressable
          onPress={toggleVideo}
          style={[
            styles.controlButton,
            !isVideoOn && styles.controlButtonOff,
          ]}
        >
          <Ionicons
            name={isVideoOn ? "videocam" : "videocam-off"}
            size={24}
            color={!isVideoOn ? "#ef4444" : "#fff"}
          />
        </Pressable>

        {/* Switch Camera Button (only visible when video is on) */}
        {isVideoOn && (
          <Pressable onPress={switchCamera} style={styles.controlButton}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </Pressable>
        )}

        {/* End Call Button */}
        <Pressable onPress={handleLeave} style={styles.endCallButton}>
          <Ionicons name="call" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonOff: {
    backgroundColor: "#1e293b",
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
  },
});
