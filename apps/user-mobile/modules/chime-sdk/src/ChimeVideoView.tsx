import React, { useEffect, useRef } from "react";
import { requireNativeViewManager } from "expo-modules-core";
import { StyleSheet, ViewStyle } from "react-native";

import { bindVideoView, unbindVideoView } from "./index";
import type { VideoScalingType } from "./ChimeSdk.types";

// Get the native view component
const NativeChimeVideoView = requireNativeViewManager("ChimeVideoView");

interface ChimeVideoViewProps {
  tileId: number;
  scalingType?: VideoScalingType;
  mirror?: boolean;
  style?: ViewStyle;
}

/**
 * Video view component that displays a Chime video tile.
 * Automatically binds/unbinds the tile when mounted/unmounted.
 */
export default function ChimeVideoView({
  tileId,
  scalingType = "aspectFit",
  mirror = false,
  style,
}: ChimeVideoViewProps) {
  const viewRef = useRef<any>(null);
  const boundTileId = useRef<number | null>(null);

  useEffect(() => {
    // Bind video tile when component mounts or tileId changes
    if (viewRef.current && tileId !== boundTileId.current) {
      // Unbind previous tile if exists
      if (boundTileId.current !== null) {
        unbindVideoView(boundTileId.current).catch(() => {});
      }

      // Bind new tile
      const viewTag = viewRef.current._nativeTag;
      if (viewTag) {
        bindVideoView(viewTag, tileId)
          .then(() => {
            boundTileId.current = tileId;
          })
          .catch((error) => {
            console.error("Failed to bind video view:", error);
          });
      }
    }

    // Cleanup on unmount
    return () => {
      if (boundTileId.current !== null) {
        unbindVideoView(boundTileId.current).catch(() => {});
        boundTileId.current = null;
      }
    };
  }, [tileId]);

  return (
    <NativeChimeVideoView
      ref={viewRef}
      scalingType={scalingType}
      mirror={mirror}
      style={[styles.videoView, style]}
    />
  );
}

const styles = StyleSheet.create({
  videoView: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
});
