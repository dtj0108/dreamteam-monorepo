import { useCallback, useEffect, useRef } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { Task, TaskStatus, TASK_STATUS_COLORS } from "../../lib/types/projects";
import { DraggableKanbanCard } from "./DraggableKanbanCard";
import { useKanbanDrag } from "../../lib/contexts/KanbanDragContext";

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  width: number;
  height?: number;
  scrollEnabled?: boolean;
}

export function KanbanColumn({
  status,
  title,
  tasks,
  onTaskPress,
  width,
  height,
  scrollEnabled = true,
}: KanbanColumnProps) {
  const color = TASK_STATUS_COLORS[status];
  const { activeDropTarget, registerColumnLayout, isDragging } = useKanbanDrag();
  const isDropTarget = activeDropTarget === status;
  const layoutRef = useRef<{ x: number; width: number } | null>(null);

  // Handle layout to register column position
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, width: layoutWidth } = event.nativeEvent.layout;
    // Store the layout in a ref to avoid re-registering on every layout
    if (!layoutRef.current || layoutRef.current.x !== x || layoutRef.current.width !== layoutWidth) {
      layoutRef.current = { x, width: layoutWidth };
      registerColumnLayout(status, { x, width: layoutWidth });
    }
  }, [status, registerColumnLayout]);

  // Animated styles for drop target highlighting
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderWidth = withTiming(isDropTarget ? 2 : 0, { duration: 150 });
    const borderColor = isDropTarget ? color : "transparent";
    const backgroundColor = isDropTarget ? `${color}15` : "#f5f5f5"; // muted bg

    return {
      borderWidth,
      borderColor,
      backgroundColor: withTiming(backgroundColor, { duration: 150 }),
    };
  }, [isDropTarget, color]);

  return (
    <Animated.View
      className="mr-3 rounded-xl overflow-hidden"
      style={[{ width, height }, containerAnimatedStyle]}
      onLayout={handleLayout}
    >
      {/* Column Header */}
      <View className="flex-row items-center justify-between px-3 pt-3 pb-2">
        <View className="flex-row items-center">
          <View
            className="mr-2 h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Text className="text-sm font-semibold text-foreground">
            {title}
          </Text>
        </View>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: color + "20" }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color }}
          >
            {tasks.length}
          </Text>
        </View>
      </View>

      {/* Tasks List */}
      <ScrollView
        className="flex-1 px-2 pb-3"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
        scrollEnabled={true}
        contentContainerStyle={{ paddingBottom: 8 }}
        bounces={true}
      >
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <DraggableKanbanCard
              key={task.id}
              task={task}
              onPress={() => onTaskPress(task)}
            />
          ))
        ) : (
          <View className="items-center justify-center py-16">
            <Text className="text-xs text-muted-foreground">No tasks</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
