import { Pressable, ScrollView, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { KnowledgeCategory } from "@/lib/types/knowledge";

interface CategoryChipsProps {
  categories: KnowledgeCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 6 }}
    >
      {/* All chip */}
      <Chip
        label="All"
        isSelected={selectedId === null}
        onPress={() => onSelect(null)}
      />

      {/* Category chips */}
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          color={category.color}
          isSelected={selectedId === category.id}
          onPress={() => onSelect(category.id)}
          count={category.page_count}
        />
      ))}
    </ScrollView>
  );
}

interface ChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  color?: string | null;
  count?: number;
}

function Chip({ label, isSelected, onPress, color, count }: ChipProps) {
  // Determine background color
  const backgroundColor = isSelected
    ? color || Colors.primary
    : Colors.muted;

  // Text color: white if selected with color, otherwise appropriate contrast
  const textColor = isSelected ? Colors.primaryForeground : Colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full px-2.5 py-0.5 active:opacity-70"
      style={{ backgroundColor }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: textColor }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          className="ml-1 rounded-full px-1"
          style={{
            backgroundColor: isSelected
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.1)",
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color: textColor }}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
