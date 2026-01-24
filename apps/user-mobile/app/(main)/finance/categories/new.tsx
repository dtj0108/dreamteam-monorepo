import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useCreateCategory } from "@/lib/hooks/useCategories";

// Predefined colors for category selection
const CATEGORY_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

// Common category icons
const CATEGORY_ICONS = [
  "tag",
  "shopping-cart",
  "home",
  "car",
  "cutlery",
  "heartbeat",
  "graduation-cap",
  "plane",
  "gift",
  "gamepad",
  "music",
  "film",
  "book",
  "briefcase",
  "money",
  "credit-card",
];

type CategoryType = "expense" | "income";

export default function NewCategoryScreen() {
  const router = useRouter();
  const createMutation = useCreateCategory();

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[10]); // blue
  const [selectedIcon, setSelectedIcon] = useState("tag");

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        type,
        color: selectedColor,
        icon: selectedIcon,
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create category. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center">
              <Pressable onPress={() => router.back()} className="mr-3">
                <FontAwesome
                  name="chevron-left"
                  size={18}
                  color={Colors.primary}
                />
              </Pressable>
              <Text className="text-2xl font-bold text-foreground">
                New Category
              </Text>
            </View>
            <Pressable
              className={`rounded-lg px-4 py-2 ${
                createMutation.isPending ? "bg-primary/50" : "bg-primary"
              }`}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              <Text className="font-medium text-white">
                {createMutation.isPending ? "Creating..." : "Create"}
              </Text>
            </Pressable>
          </View>

          {/* Preview */}
          <View className="mb-6 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: selectedColor }}
            >
              <FontAwesome
                name={selectedIcon as "tag"}
                size={32}
                color="white"
              />
            </View>
            <Text className="mt-3 text-lg font-semibold text-foreground">
              {name || "Category Name"}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {type === "expense" ? "Expense" : "Income"}
            </Text>
          </View>

          {/* Name Input */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Name
            </Text>
            <TextInput
              className="rounded-xl bg-muted p-4 text-foreground"
              placeholder="Enter category name"
              placeholderTextColor={Colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Type Selection */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Type
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-xl p-4 ${
                  type === "expense" ? "bg-red-500/10" : "bg-muted"
                }`}
                onPress={() => setType("expense")}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome
                    name="arrow-circle-up"
                    size={18}
                    color={type === "expense" ? "#ef4444" : Colors.mutedForeground}
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      type === "expense" ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    Expense
                  </Text>
                </View>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-xl p-4 ${
                  type === "income" ? "bg-green-500/10" : "bg-muted"
                }`}
                onPress={() => setType("income")}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome
                    name="arrow-circle-down"
                    size={18}
                    color={type === "income" ? "#22c55e" : Colors.mutedForeground}
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      type === "income" ? "text-green-500" : "text-muted-foreground"
                    }`}
                  >
                    Income
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Color Selection */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Color
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORY_COLORS.map((color) => (
                <Pressable
                  key={color}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    selectedColor === color ? "border-2 border-foreground" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <FontAwesome name="check" size={14} color="white" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Icon Selection */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Icon
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORY_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  className={`h-12 w-12 items-center justify-center rounded-xl ${
                    selectedIcon === icon ? "bg-primary" : "bg-muted"
                  }`}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <FontAwesome
                    name={icon as "tag"}
                    size={18}
                    color={selectedIcon === icon ? "white" : Colors.mutedForeground}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
