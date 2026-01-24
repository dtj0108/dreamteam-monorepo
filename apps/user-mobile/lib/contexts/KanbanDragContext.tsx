import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useSharedValue, SharedValue, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Task, TaskStatus } from "../types/projects";

export interface ColumnLayout {
  x: number;
  width: number;
}

interface KanbanDragContextValue {
  // Reanimated shared values (UI thread)
  isDragging: SharedValue<boolean>;
  draggedTaskId: SharedValue<string | null>;
  dragPosition: { x: SharedValue<number>; y: SharedValue<number> };
  touchOffset: { x: SharedValue<number>; y: SharedValue<number> };
  horizontalScrollOffset: SharedValue<number>;
  columnLayouts: SharedValue<Record<TaskStatus, ColumnLayout>>;

  // React state (for UI updates)
  draggedTask: Task | null;
  activeDropTarget: TaskStatus | null;
  scrollEnabled: boolean;

  // Actions
  startDrag: (task: Task, startX: number, startY: number, offsetX: number, offsetY: number) => void;
  updateDragPosition: (x: number, y: number) => void;
  setActiveDropTarget: (status: TaskStatus | null) => void;
  setScrollEnabled: (enabled: boolean) => void;
  registerColumnLayout: (status: TaskStatus, layout: ColumnLayout) => void;
  onDragEnd: (targetStatus: TaskStatus | null) => void;
  showActionSheet: () => void;

  // Callbacks
  onTaskMoved?: (task: Task, newStatus: TaskStatus) => void;
  onActionSheetRequested?: (task: Task) => void;
}

const KanbanDragContext = createContext<KanbanDragContextValue | null>(null);

interface KanbanDragProviderProps {
  children: React.ReactNode;
  onTaskMoved?: (task: Task, newStatus: TaskStatus) => void;
  onActionSheetRequested?: (task: Task) => void;
}

export function KanbanDragProvider({
  children,
  onTaskMoved,
  onActionSheetRequested,
}: KanbanDragProviderProps) {
  // Shared values for smooth animations on UI thread
  const isDragging = useSharedValue(false);
  const draggedTaskId = useSharedValue<string | null>(null);
  const dragPositionX = useSharedValue(0);
  const dragPositionY = useSharedValue(0);
  const touchOffsetX = useSharedValue(0);  // Offset from card's left edge where user touched
  const touchOffsetY = useSharedValue(0);  // Offset from card's top edge where user touched
  const horizontalScrollOffset = useSharedValue(0);
  const columnLayouts = useSharedValue<Record<TaskStatus, ColumnLayout>>({
    todo: { x: 0, width: 0 },
    in_progress: { x: 0, width: 0 },
    review: { x: 0, width: 0 },
    done: { x: 0, width: 0 },
  });

  // React state for re-renders
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<TaskStatus | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const startDrag = useCallback((task: Task, startX: number, startY: number, offsetX: number, offsetY: number) => {
    isDragging.value = true;
    draggedTaskId.value = task.id;
    dragPositionX.value = startX;
    dragPositionY.value = startY;
    touchOffsetX.value = offsetX;
    touchOffsetY.value = offsetY;
    setDraggedTask(task);
    setScrollEnabled(false);
    triggerHaptic();
  }, [isDragging, draggedTaskId, dragPositionX, dragPositionY, touchOffsetX, touchOffsetY, triggerHaptic]);

  const updateDragPosition = useCallback((x: number, y: number) => {
    dragPositionX.value = x;
    dragPositionY.value = y;
  }, [dragPositionX, dragPositionY]);

  const registerColumnLayout = useCallback((status: TaskStatus, layout: ColumnLayout) => {
    columnLayouts.modify((layouts) => {
      "worklet";
      layouts[status] = layout;
      return layouts;
    });
  }, [columnLayouts]);

  const onDragEnd = useCallback((targetStatus: TaskStatus | null) => {
    const task = draggedTask;

    isDragging.value = false;
    draggedTaskId.value = null;
    setDraggedTask(null);
    setActiveDropTarget(null);
    setScrollEnabled(true);

    if (task && targetStatus && targetStatus !== task.status && onTaskMoved) {
      onTaskMoved(task, targetStatus);
    }
  }, [draggedTask, isDragging, draggedTaskId, onTaskMoved]);

  const showActionSheet = useCallback(() => {
    const task = draggedTask;

    isDragging.value = false;
    draggedTaskId.value = null;
    setDraggedTask(null);
    setActiveDropTarget(null);
    setScrollEnabled(true);

    if (task && onActionSheetRequested) {
      // Small delay to let drag state clear before showing action sheet
      setTimeout(() => {
        onActionSheetRequested(task);
      }, 50);
    }
  }, [draggedTask, isDragging, draggedTaskId, onActionSheetRequested]);

  const value = useMemo<KanbanDragContextValue>(() => ({
    isDragging,
    draggedTaskId,
    dragPosition: { x: dragPositionX, y: dragPositionY },
    touchOffset: { x: touchOffsetX, y: touchOffsetY },
    horizontalScrollOffset,
    columnLayouts,
    draggedTask,
    activeDropTarget,
    scrollEnabled,
    startDrag,
    updateDragPosition,
    setActiveDropTarget,
    setScrollEnabled,
    registerColumnLayout,
    onDragEnd,
    showActionSheet,
    onTaskMoved,
    onActionSheetRequested,
  }), [
    isDragging,
    draggedTaskId,
    dragPositionX,
    dragPositionY,
    touchOffsetX,
    touchOffsetY,
    horizontalScrollOffset,
    columnLayouts,
    draggedTask,
    activeDropTarget,
    scrollEnabled,
    startDrag,
    updateDragPosition,
    setActiveDropTarget,
    setScrollEnabled,
    registerColumnLayout,
    onDragEnd,
    showActionSheet,
    onTaskMoved,
    onActionSheetRequested,
  ]);

  return (
    <KanbanDragContext.Provider value={value}>
      {children}
    </KanbanDragContext.Provider>
  );
}

export function useKanbanDrag() {
  const context = useContext(KanbanDragContext);
  if (!context) {
    throw new Error("useKanbanDrag must be used within a KanbanDragProvider");
  }
  return context;
}

// Worklet function to detect which column a point is over
export function detectColumnAtPosition(
  absoluteX: number,
  scrollOffset: number,
  layouts: Record<TaskStatus, ColumnLayout>
): TaskStatus | null {
  "worklet";
  const adjustedX = absoluteX + scrollOffset;

  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
  for (const status of statuses) {
    const layout = layouts[status];
    if (layout && adjustedX >= layout.x && adjustedX <= layout.x + layout.width) {
      return status;
    }
  }
  return null;
}
