import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useCalendarData } from "@/lib/hooks/useAnalytics";
import {
  CalendarDay,
  CalendarEvent,
  CALENDAR_EVENT_COLORS,
  CalendarEventType,
} from "@/lib/types/finance";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading } = useCalendarData(currentYear, currentMonth + 1);

  // Create a map of events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (data?.days) {
      for (const day of data.days) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [data]);

  // Get days for the calendar grid
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: (Date | null)[] = [];

    // Add empty slots for days before first of month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    // Pad to complete weeks
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const selectedDayData = selectedDate ? eventsByDate.get(selectedDate) : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <FontAwesome name="chevron-left" size={18} color={Colors.primary} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          Financial Calendar
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable
            onPress={handlePrevMonth}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <FontAwesome name="chevron-left" size={14} color={Colors.foreground} />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">
            {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Pressable
            onPress={handleNextMonth}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <FontAwesome name="chevron-right" size={14} color={Colors.foreground} />
          </Pressable>
        </View>

        {/* Monthly Summary */}
        {data?.summary && (
          <View className="mx-4 mb-4 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-emerald-500/10 p-3">
              <Text className="text-xs text-emerald-600">Income</Text>
              <Text className="text-lg font-bold text-emerald-600">
                {formatCurrency(data.summary.totalIncome)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-red-500/10 p-3">
              <Text className="text-xs text-red-500">Expenses</Text>
              <Text className="text-lg font-bold text-red-500">
                {formatCurrency(data.summary.totalExpenses)}
              </Text>
            </View>
            <View
              className={`flex-1 rounded-xl p-3 ${
                data.summary.netCashFlow >= 0 ? "bg-sky-500/10" : "bg-amber-500/10"
              }`}
            >
              <Text
                className={`text-xs ${
                  data.summary.netCashFlow >= 0 ? "text-sky-600" : "text-amber-600"
                }`}
              >
                Net
              </Text>
              <Text
                className={`text-lg font-bold ${
                  data.summary.netCashFlow >= 0 ? "text-sky-600" : "text-amber-600"
                }`}
              >
                {data.summary.netCashFlow >= 0 ? "+" : "-"}
                {formatCurrency(data.summary.netCashFlow)}
              </Text>
            </View>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Calendar Grid */}
        {!isLoading && (
          <View className="mx-4">
            {/* Weekday Headers */}
            <View className="mb-2 flex-row">
              {WEEKDAYS.map((day) => (
                <View key={day} className="flex-1 items-center py-2">
                  <Text className="text-xs font-medium text-muted-foreground">
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} className="w-[14.28%] h-16" />;
                }

                const dateKey = formatDateKey(date);
                const dayData = eventsByDate.get(dateKey);
                const hasEvents = dayData && dayData.events.length > 0;
                const isSelected = selectedDate === dateKey;
                const isTodayDate = isToday(date);

                // Get unique event types for dots
                const eventTypes = new Set<CalendarEventType>();
                if (dayData?.events) {
                  for (const event of dayData.events) {
                    eventTypes.add(event.type);
                  }
                }

                return (
                  <Pressable
                    key={dateKey}
                    className={`w-[14.28%] h-16 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-primary"
                        : isTodayDate
                        ? "bg-primary/10"
                        : ""
                    }`}
                    onPress={() => setSelectedDate(dateKey)}
                  >
                    <Text
                      className={`text-base font-medium ${
                        isSelected
                          ? "text-white"
                          : isTodayDate
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </Text>
                    {hasEvents && (
                      <View className="mt-1 flex-row gap-0.5">
                        {Array.from(eventTypes)
                          .slice(0, 3)
                          .map((type) => (
                            <View
                              key={type}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: isSelected
                                  ? "white"
                                  : CALENDAR_EVENT_COLORS[type],
                              }}
                            />
                          ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Legend */}
        <View className="mx-4 mt-4 flex-row flex-wrap gap-4">
          <LegendItem type="income" label="Income" />
          <LegendItem type="expense" label="Expenses" />
          <LegendItem type="subscription" label="Bills" />
          <LegendItem type="recurring" label="Recurring" />
        </View>

        {/* Selected Day Details */}
        {selectedDayData && (
          <View className="mx-4 mt-6">
            <Text className="mb-3 text-lg font-semibold text-foreground">
              {new Date(selectedDate!).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {/* Day Summary */}
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-xl bg-muted p-3">
                <Text className="text-xs text-muted-foreground">Income</Text>
                <Text className="font-bold text-emerald-600">
                  +{formatCurrency(selectedDayData.totals.income)}
                </Text>
              </View>
              <View className="flex-1 rounded-xl bg-muted p-3">
                <Text className="text-xs text-muted-foreground">Expenses</Text>
                <Text className="font-bold text-red-500">
                  -{formatCurrency(selectedDayData.totals.expenses)}
                </Text>
              </View>
            </View>

            {/* Events List */}
            {selectedDayData.events.length > 0 ? (
              <View className="gap-2">
                {selectedDayData.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            ) : (
              <View className="items-center py-4">
                <Text className="text-muted-foreground">
                  No transactions on this day
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({
  type,
  label,
}: {
  type: CalendarEventType;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: CALENDAR_EVENT_COLORS[type] }}
      />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const isIncome = event.amount > 0;
  const color = CALENDAR_EVENT_COLORS[event.type];

  return (
    <View className="flex-row items-center rounded-xl bg-muted p-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: color + "20" }}
      >
        <FontAwesome
          name={isIncome ? "arrow-down" : "arrow-up"}
          size={16}
          color={color}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {event.title}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {event.category?.name || "Uncategorized"}
        </Text>
      </View>
      <Text
        className={`font-bold ${isIncome ? "text-emerald-600" : "text-foreground"}`}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(event.amount)}
      </Text>
    </View>
  );
}
