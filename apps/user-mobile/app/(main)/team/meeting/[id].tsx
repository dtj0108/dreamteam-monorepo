import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useMeeting } from "@/providers/meeting-provider";
import { VideoGrid } from "@/components/meetings/VideoGrid";
import { MeetingControls } from "@/components/meetings/MeetingControls";
import { ParticipantsList } from "@/components/meetings/ParticipantsList";
import { requestMediaPermissions } from "@/lib/permissions";

export default function MeetingRoomScreen() {
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    isAvailable,
    status,
    error,
    participants,
    activeSpeakerIds,
    joinMeeting,
    leaveMeeting,
  } = useMeeting();

  const [showParticipants, setShowParticipants] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Join meeting on mount
  useEffect(() => {
    if (!channelId) return;

    const initMeeting = async () => {
      setIsJoining(true);

      // Request permissions first
      const hasPermissions = await requestMediaPermissions();
      if (!hasPermissions) {
        Alert.alert(
          "Permissions Required",
          "Camera and microphone permissions are required to join a huddle.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      try {
        await joinMeeting(channelId);
      } catch (err) {
        console.error("Failed to join meeting:", err);
      } finally {
        setIsJoining(false);
      }
    };

    initMeeting();

    // Cleanup on unmount
    return () => {
      leaveMeeting().catch(() => {});
    };
  }, [channelId]);

  // Handle leave
  const handleLeave = useCallback(() => {
    router.back();
  }, [router]);

  // Convert participants Map to array
  const participantsArray = Array.from(participants.values());

  // Render unavailable state (Expo Go)
  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centerContent}>
          <Ionicons name="build-outline" size={48} color="#64748b" />
          <Text style={styles.unavailableTitle}>Development Build Required</Text>
          <Text style={styles.unavailableDescription}>
            Huddles require a development build with native code.
          </Text>
          <Text style={styles.unavailableCode}>
            Run: eas build --profile development
          </Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Render connecting state
  if (status === "joining" || isJoining) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.statusText}>Joining huddle...</Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (status === "failed") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centerContent}>
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to join huddle</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleLeave} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Huddle</Text>
          <Text style={styles.headerSubtitle}>
            {participantsArray.length} participant
            {participantsArray.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <Pressable
          onPress={() => setShowParticipants(true)}
          style={styles.participantsButton}
        >
          <Ionicons name="people" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Video Grid */}
      <View style={styles.videoContainer}>
        {participantsArray.length > 0 ? (
          <VideoGrid
            participants={participantsArray}
            activeSpeakerIds={activeSpeakerIds}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>Waiting for others to join...</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <MeetingControls onLeave={handleLeave} />

      {/* Participants Modal */}
      <ParticipantsList
        visible={showParticipants}
        onClose={() => setShowParticipants(false)}
        participants={participantsArray}
        activeSpeakerIds={activeSpeakerIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 16,
  },
  unavailableTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  unavailableDescription: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  unavailableCode: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  errorDescription: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#334155",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0f172a",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 2,
  },
  participantsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    marginTop: 12,
  },
});
