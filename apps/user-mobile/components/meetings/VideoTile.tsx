import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ChimeVideoView } from "@/modules/chime-sdk/src";

interface VideoTileProps {
  tileId: number;
  participantName: string;
  isMuted: boolean;
  isLocalTile: boolean;
  isSpeaking?: boolean;
}

export function VideoTile({
  tileId,
  participantName,
  isMuted,
  isLocalTile,
  isSpeaking = false,
}: VideoTileProps) {
  return (
    <View
      style={[
        styles.container,
        isSpeaking && styles.speaking,
      ]}
    >
      {/* Video content */}
      <ChimeVideoView
        tileId={tileId}
        scalingType="aspectFill"
        mirror={isLocalTile}
        style={styles.video}
      />

      {/* Overlay with participant info */}
      <View style={styles.overlay}>
        {/* Name badge */}
        <View style={styles.nameBadge}>
          <Text style={styles.nameText} numberOfLines={1}>
            {isLocalTile ? "You" : participantName}
          </Text>
        </View>

        {/* Mute indicator */}
        {isMuted && (
          <View style={styles.muteIndicator}>
            <Ionicons name="mic-off" size={16} color="#ef4444" />
          </View>
        )}
      </View>
    </View>
  );
}

interface PlaceholderTileProps {
  participantName: string;
  isMuted: boolean;
  isLocalTile: boolean;
  isSpeaking?: boolean;
}

export function PlaceholderTile({
  participantName,
  isMuted,
  isLocalTile,
  isSpeaking = false,
}: PlaceholderTileProps) {
  // Get initials from name
  const initials = participantName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.container,
        styles.placeholder,
        isSpeaking && styles.speaking,
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Overlay with participant info */}
      <View style={styles.overlay}>
        {/* Name badge */}
        <View style={styles.nameBadge}>
          <Text style={styles.nameText} numberOfLines={1}>
            {isLocalTile ? "You" : participantName}
          </Text>
        </View>

        {/* Mute indicator */}
        {isMuted && (
          <View style={styles.muteIndicator}>
            <Ionicons name="mic-off" size={16} color="#ef4444" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  speaking: {
    borderWidth: 3,
    borderColor: "#22c55e",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: "70%",
  },
  nameText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  muteIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 4,
    borderRadius: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
});
