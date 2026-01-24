import React, { useCallback } from "react";
import { LayoutChangeEvent, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useKanbanDrag } from "../../lib/contexts/KanbanDragContext";
import { KanbanTaskCard } from "./KanbanTaskCard";

interface DragOverlayProps {
  cardWidth: number;
}

export function DragOverlay({ cardWidth }: DragOverlayProps) {
  const { isDragging, dragPosition, touchOffset, draggedTask } = useKanbanDrag();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Track the container's offset from window origin (accounts for header height)
  const containerOffsetX = useSharedValue(0);
  const containerOffsetY = useSharedValue(0);

  // Measure container position on layout to get offset from window
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    event.target.measureInWindow((x, y) => {
      containerOffsetX.value = x;
      containerOffsetY.value = y;
    });
  }, [containerOffsetX, containerOffsetY]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = isDragging.value ? 1 : 0;
    const scale = isDragging.value ? 1.05 : 0.95;

    return {
      opacity: withSpring(opacity, { damping: 20, stiffness: 300 }),
      transform: [
        // Position card so touch point stays under finger
        // dragPosition is window-relative, subtract containerOffset to convert to container-local coords
        // touchOffset is where on the card the user touched
        { translateX: dragPosition.x.value - touchOffset.x.value - containerOffsetX.value },
        { translateY: dragPosition.y.value - touchOffset.y.value - containerOffsetY.value },
        { scale: withSpring(scale, { damping: 15, stiffness: 150 }) },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = isDragging.value
      ? interpolate(1, [0, 1], [0, 0.25], Extrapolation.CLAMP)
      : 0;

    return {
      shadowOpacity: withSpring(shadowOpacity, { damping: 20, stiffness: 300 }),
    };
  });

  // Don't render anything if no task is being dragged
  if (!draggedTask) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={handleContainerLayout}
      style={[
        styles.overlay,
        { width: screenWidth, height: screenHeight },
      ]}
    >
      <Animated.View
        style={[
          styles.cardContainer,
          { width: cardWidth - 16 }, // Account for padding in column
          animatedStyle,
          shadowStyle,
          styles.shadow,
        ]}
      >
        <KanbanTaskCard task={draggedTask} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  cardContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
});
