import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Participant } from "@/providers/meeting-provider";

interface ParticipantsListProps {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  activeSpeakerIds: string[];
}

export function ParticipantsList({
  visible,
  onClose,
  participants,
  activeSpeakerIds,
}: ParticipantsListProps) {
  const insets = useSafeAreaInsets();

  // Get participant name from external user ID (format: userId#name)
  const getParticipantName = (externalUserId: string): string => {
    const parts = externalUserId.split("#");
    return parts.length > 1 ? parts[1] : externalUserId;
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={40} style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Participants ({participants.length})
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Participants List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {participants.map((participant) => {
              const name = getParticipantName(participant.externalUserId);
              const initials = getInitials(name);
              const isSpeaking = activeSpeakerIds.includes(participant.attendeeId);

              return (
                <View key={participant.attendeeId} style={styles.participantRow}>
                  {/* Avatar */}
                  <View
                    style={[
                      styles.avatar,
                      isSpeaking && styles.avatarSpeaking,
                    ]}
                  >
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  {/* Name */}
                  <Text style={styles.participantName} numberOfLines={1}>
                    {name}
                  </Text>

                  {/* Status Icons */}
                  <View style={styles.statusIcons}>
                    {participant.isMuted && (
                      <View style={styles.statusIcon}>
                        <Ionicons name="mic-off" size={18} color="#ef4444" />
                      </View>
                    )}
                    {participant.isVideoOn && (
                      <View style={styles.statusIcon}>
                        <Ionicons name="videocam" size={18} color="#22c55e" />
                      </View>
                    )}
                    {isSpeaking && (
                      <View style={styles.statusIcon}>
                        <Ionicons name="volume-high" size={18} color="#3b82f6" />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarSpeaking: {
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  participantName: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  statusIcons: {
    flexDirection: "row",
    gap: 8,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
