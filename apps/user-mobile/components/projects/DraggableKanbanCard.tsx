import React, { useRef, useCallback } from "react";
import { StyleSheet, LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Task, TaskStatus } from "../../lib/types/projects";
import { useKanbanDrag, detectColumnAtPosition } from "../../lib/contexts/KanbanDragContext";
import { KanbanTaskCard } from "./KanbanTaskCard";

interface DraggableKanbanCardProps {
  task: Task;
  onPress: () => void;
}

const LONG_PRESS_DURATION = 300;
const MOVEMENT_THRESHOLD = 10;

export function DraggableKanbanCard({ task, onPress }: DraggableKanbanCardProps) {
  const {
    isDragging,
    draggedTaskId,
    dragPosition,
    horizontalScrollOffset,
    columnLayouts,
    startDrag,
    updateDragPosition,
    setActiveDropTarget,
    onDragEnd,
    showActionSheet,
  } = useKanbanDrag();

  // Track if this specific card is being dragged (shared value for worklet access)
  const isThisCardDragging = useSharedValue(false);

  // Store card layout for calculating touch offset
  const cardLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Track drag state
  const startPosition = useRef({ x: 0, y: 0 });
  const hasMovedBeyondThreshold = useRef(false);
  const longPressTriggered = useRef(false);

  // Animated opacity for "ghost" card effect
  const animatedStyle = useAnimatedStyle(() => {
    const isBeingDragged = draggedTaskId.value === task.id;
    return {
      opacity: isBeingDragged ? 0.3 : 1,
      transform: [
        { scale: withSpring(isBeingDragged ? 0.98 : 1, { damping: 15, stiffness: 150 }) },
      ],
    };
  });

  // Measure card position on layout
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    event.target.measureInWindow((x, y, width, height) => {
      cardLayout.current = { x, y, width, height };
    });
  }, []);

  // Trigger haptic feedback (called from worklet via runOnJS)
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Start the drag (called from worklet via runOnJS)
  const handleStartDrag = useCallback((absoluteX: number, absoluteY: number) => {
    // Calculate touch offset relative to card's top-left corner
    const offsetX = absoluteX - cardLayout.current.x;
    const offsetY = absoluteY - cardLayout.current.y;

    startDrag(task, absoluteX, absoluteY, offsetX, offsetY);
    startPosition.current = { x: absoluteX, y: absoluteY };
    hasMovedBeyondThreshold.current = false;
    longPressTriggered.current = true;
  }, [task, startDrag]);

  const handleUpdatePosition = useCallback((absoluteX: number, absoluteY: number) => {
    updateDragPosition(absoluteX, absoluteY);
  }, [updateDragPosition]);

  const handleSetDropTarget = useCallback((status: TaskStatus | null) => {
    setActiveDropTarget(status);
  }, [setActiveDropTarget]);

  const handleDragEnd = useCallback((targetStatus: TaskStatus | null, didMove: boolean) => {
    isThisCardDragging.value = false;

    // If we never moved beyond threshold, show action sheet instead
    if (!didMove) {
      showActionSheet();
    } else {
      onDragEnd(targetStatus);
    }
  }, [isThisCardDragging, onDragEnd, showActionSheet]);

  const handleTap = useCallback(() => {
    // Only trigger tap if long press wasn't triggered
    if (!longPressTriggered.current) {
      onPress();
    }
    longPressTriggered.current = false;
  }, [onPress]);

  // Pan gesture with built-in long press delay
  // activateAfterLongPress delays Pan activation, allowing scroll gestures to work
  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION)
    .onStart((e) => {
      "worklet";
      // Set shared value synchronously on UI thread
      isThisCardDragging.value = true;
      // Trigger haptic and JS state updates via runOnJS
      runOnJS(triggerHaptic)();
      runOnJS(handleStartDrag)(e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => {
      "worklet";
      if (!isThisCardDragging.value) return;

      // Update drag position
      runOnJS(handleUpdatePosition)(e.absoluteX, e.absoluteY);

      // Check if we've moved beyond threshold
      const dx = e.absoluteX - startPosition.current.x;
      const dy = e.absoluteY - startPosition.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MOVEMENT_THRESHOLD) {
        hasMovedBeyondThreshold.current = true;
      }

      // Detect column under finger
      const detectedColumn = detectColumnAtPosition(
        e.absoluteX,
        horizontalScrollOffset.value,
        columnLayouts.value
      );
      runOnJS(handleSetDropTarget)(detectedColumn);
    })
    .onEnd((e) => {
      "worklet";
      if (!isThisCardDragging.value) return;

      // Detect final column
      const targetColumn = detectColumnAtPosition(
        e.absoluteX,
        horizontalScrollOffset.value,
        columnLayouts.value
      );
      runOnJS(handleDragEnd)(targetColumn, hasMovedBeyondThreshold.current);
    })
    .onFinalize(() => {
      "worklet";
      if (isThisCardDragging.value) {
        runOnJS(handleDragEnd)(null, hasMovedBeyondThreshold.current);
      }
    });

  // Tap for press
  // maxDuration(250) and maxDistance(10) provide tight tap detection
  // so scroll gestures pass through to parent ScrollView
  const tap = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(10)
    .onStart(() => {
      longPressTriggered.current = false;
    })
    .onEnd(() => {
      runOnJS(handleTap)();
    });

  // Compose gestures: pan (with long press delay) and tap race
  const gesture = Gesture.Race(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle} onLayout={handleLayout}>
        <KanbanTaskCard task={task} />
      </Animated.View>
    </GestureDetector>
  );
}
