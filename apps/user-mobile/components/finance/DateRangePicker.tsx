import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { DateRange } from "@/lib/types/finance";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
}

type PresetKey =
  | "all"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateRange | undefined;
}

const presets: Preset[] = [
  {
    key: "all",
    label: "All Time",
    getRange: () => undefined,
  },
  {
    key: "this_month",
    label: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "last_month",
    label: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "last_3_months",
    label: "Last 3 Months",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "last_6_months",
    label: "Last 6 Months",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "this_year",
    label: "This Year",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    },
  },
  {
    key: "last_year",
    label: "Last Year",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    },
  },
];

const getPresetLabel = (value?: DateRange): string => {
  if (!value) return "All Time";

  // Try to match against presets
  for (const preset of presets) {
    const range = preset.getRange();
    if (
      range?.startDate === value.startDate &&
      range?.endDate === value.endDate
    ) {
      return preset.label;
    }
  }

  // Custom range - show dates
  return `${value.startDate} - ${value.endDate}`;
};

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (preset: Preset) => {
    onChange(preset.getRange());
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center gap-2 rounded-lg bg-muted px-3 py-2"
      >
        <FontAwesome name="calendar" size={14} color={Colors.mutedForeground} />
        <Text className="text-sm text-foreground">{getPresetLabel(value)}</Text>
        <FontAwesome
          name="chevron-down"
          size={10}
          color={Colors.mutedForeground}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className="mx-6 w-full max-w-sm rounded-2xl bg-background p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-4 text-lg font-semibold text-foreground">
              Select Date Range
            </Text>

            <View className="gap-2">
              {presets.map((preset) => {
                const range = preset.getRange();
                const isSelected =
                  (!value && !range) ||
                  (value?.startDate === range?.startDate &&
                    value?.endDate === range?.endDate);

                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => handleSelect(preset)}
                    className={`rounded-xl px-4 py-3 ${
                      isSelected ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`font-medium ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {preset.label}
                      </Text>
                      {isSelected && (
                        <FontAwesome
                          name="check"
                          size={14}
                          color={Colors.primary}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setIsOpen(false)}
              className="mt-4 rounded-xl bg-muted py-3"
            >
              <Text className="text-center text-muted-foreground">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
