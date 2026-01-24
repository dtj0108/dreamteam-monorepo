import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { useProject, useTasks } from "../../../../lib/hooks/useProjects";
import {
  Task,
  TASK_STATUS_COLORS,
  getTaskStatusLabel,
} from "../../../../lib/types/projects";
import { TaskCard } from "../../../../components/projects/TaskCard";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

export default function ProjectCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch data
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasksData, isLoading: tasksLoading, refetch } = useTasks(id);
  const tasks = tasksData?.tasks || [];

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date.split("T")[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      const dateKey = date.toISOString().split("T")[0];
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        tasks: tasksByDate.get(dateKey) || [],
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateKey = date.toISOString().split("T")[0];
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        tasks: tasksByDate.get(dateKey) || [],
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateKey = date.toISOString().split("T")[0];
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        tasks: tasksByDate.get(dateKey) || [],
      });
    }

    return days;
  }, [currentDate, tasksByDate]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split("T")[0];
    return tasksByDate.get(dateKey) || [];
  }, [selectedDate, tasksByDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleTaskPress = (task: Task) => {
    router.push({
      pathname: "/(main)/projects/(tabs)/(home)/tasks/[taskId]",
      params: { taskId: task.id, projectId: id },
    });
  };

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Calendar",
          headerBackTitle: "Board",
          headerStyle: { backgroundColor: "#fafafa" },
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
          <Pressable
            className="p-2"
            onPress={goToPreviousMonth}
          >
            <FontAwesome name="chevron-left" size={16} color="#6b7280" />
          </Pressable>

          <Pressable onPress={goToToday}>
            <Text className="text-lg font-bold text-foreground">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
          </Pressable>

          <Pressable
            className="p-2"
            onPress={goToNextMonth}
          >
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </Pressable>
        </View>

        {/* Days of Week Header */}
        <View className="flex-row border-b border-gray-100 px-2 py-2">
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} className="flex-1 items-center">
              <Text className="text-xs font-medium text-muted-foreground">{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="px-2 py-1">
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <View key={weekIndex} className="flex-row">
              {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                const isSelected =
                  selectedDate &&
                  day.date.toISOString().split("T")[0] ===
                    selectedDate.toISOString().split("T")[0];

                return (
                  <Pressable
                    key={dayIndex}
                    className={`flex-1 items-center p-2 ${isSelected ? "rounded-lg bg-primary/10" : ""}`}
                    onPress={() => setSelectedDate(day.date)}
                  >
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-full ${
                        day.isToday ? "bg-primary" : ""
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          day.isToday
                            ? "text-white"
                            : day.isCurrentMonth
                              ? "text-foreground"
                              : "text-gray-300"
                        }`}
                      >
                        {day.date.getDate()}
                      </Text>
                    </View>

                    {/* Task indicators */}
                    {day.tasks.length > 0 && (
                      <View className="mt-0.5 flex-row items-center justify-center gap-0.5">
                        {day.tasks.slice(0, 3).map((task, i) => (
                          <View
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: TASK_STATUS_COLORS[task.status] }}
                          />
                        ))}
                        {day.tasks.length > 3 && (
                          <Text className="text-[8px] text-muted-foreground">
                            +{day.tasks.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Date Tasks */}
        {selectedDate && (
          <View className="mt-4 border-t border-gray-100 px-4 pt-4">
            <Text className="mb-3 text-sm font-semibold text-muted-foreground">
              {formatSelectedDate(selectedDate)}
            </Text>

            {selectedDateTasks.length === 0 ? (
              <View className="items-center py-8">
                <FontAwesome name="calendar-o" size={32} color="#d1d5db" />
                <Text className="mt-2 text-muted-foreground">No tasks due on this date</Text>
              </View>
            ) : (
              selectedDateTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task)}
                />
              ))
            )}
          </View>
        )}

        {/* Legend */}
        <View className="mx-4 mt-6 mb-4 rounded-lg bg-muted p-3">
          <Text className="mb-2 text-xs font-medium text-muted-foreground">Legend</Text>
          <View className="flex-row flex-wrap gap-4">
            {(["todo", "in_progress", "review", "done"] as const).map((status) => (
              <View key={status} className="flex-row items-center">
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
                />
                <Text className="ml-1.5 text-xs text-muted-foreground">
                  {getTaskStatusLabel(status)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
