import React, { useMemo } from "react";
import { View, Dimensions, StyleSheet } from "react-native";

import { VideoTile, PlaceholderTile } from "./VideoTile";
import { useMeeting, type Participant } from "@/providers/meeting-provider";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_GAP = 8;
const GRID_PADDING = 16;

interface VideoGridProps {
  participants: Participant[];
  activeSpeakerIds: string[];
}

export function VideoGrid({ participants, activeSpeakerIds }: VideoGridProps) {
  const { videoTiles, localVideoTileId, isVideoOn, isAudioMuted } = useMeeting();

  // Calculate grid layout based on participant count
  const layout = useMemo(() => {
    const count = participants.length;

    if (count === 1) {
      return { cols: 1, rows: 1 };
    } else if (count === 2) {
      return { cols: 1, rows: 2 };
    } else if (count <= 4) {
      return { cols: 2, rows: 2 };
    } else if (count <= 6) {
      return { cols: 2, rows: 3 };
    } else {
      return { cols: 3, rows: 3 };
    }
  }, [participants.length]);

  // Calculate tile dimensions
  const tileDimensions = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (layout.cols - 1);
    const availableHeight = SCREEN_HEIGHT - 200 - GRID_GAP * (layout.rows - 1); // Leave room for controls

    const tileWidth = availableWidth / layout.cols;
    const tileHeight = availableHeight / layout.rows;

    return { width: tileWidth, height: tileHeight };
  }, [layout]);

  // Get participant name from external user ID (format: userId#name)
  const getParticipantName = (externalUserId: string): string => {
    const parts = externalUserId.split("#");
    return parts.length > 1 ? parts[1] : externalUserId;
  };

  // Render individual tile
  const renderTile = (participant: Participant, index: number) => {
    const isSpeaking = activeSpeakerIds.includes(participant.attendeeId);
    const name = getParticipantName(participant.externalUserId);
    const hasVideo = participant.videoTileId !== null;

    // Check if this is the local participant (has local video tile)
    const isLocalParticipant = participant.videoTileId === localVideoTileId;

    return (
      <View
        key={participant.attendeeId}
        style={[
          styles.tile,
          {
            width: tileDimensions.width,
            height: tileDimensions.height,
          },
        ]}
      >
        {hasVideo && participant.videoTileId !== null ? (
          <VideoTile
            tileId={participant.videoTileId}
            participantName={name}
            isMuted={participant.isMuted}
            isLocalTile={isLocalParticipant}
            isSpeaking={isSpeaking}
          />
        ) : (
          <PlaceholderTile
            participantName={name}
            isMuted={participant.isMuted}
            isLocalTile={isLocalParticipant}
            isSpeaking={isSpeaking}
          />
        )}
      </View>
    );
  };

  // Arrange tiles into rows
  const rows = useMemo(() => {
    const result: Participant[][] = [];
    for (let i = 0; i < participants.length; i += layout.cols) {
      result.push(participants.slice(i, i + layout.cols));
    }
    return result;
  }, [participants, layout.cols]);

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((participant, colIndex) =>
            renderTile(participant, rowIndex * layout.cols + colIndex)
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: GRID_PADDING,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: GRID_GAP,
  },
  tile: {
    marginHorizontal: GRID_GAP / 2,
  },
});
