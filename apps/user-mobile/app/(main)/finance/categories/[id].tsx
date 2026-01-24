import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { Loading } from "@/components/Loading";
import { Colors } from "@/constants/Colors";
import {
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories";
import { Category } from "@/lib/types/finance";

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

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useCategories();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const category = data?.categories.find((c) => c.id === id);
  const otherCategories =
    data?.categories.filter((c) => c.id !== id && c.type === category?.type) ??
    [];

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[10]);
  const [selectedIcon, setSelectedIcon] = useState("tag");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with category data
  useEffect(() => {
    if (category) {
      setName(category.name);
      setSelectedColor(category.color || CATEGORY_COLORS[10]);
      setSelectedIcon(category.icon || "tag");
    }
  }, [category]);

  // Track changes
  useEffect(() => {
    if (category) {
      const changed =
        name !== category.name ||
        selectedColor !== (category.color || CATEGORY_COLORS[10]) ||
        selectedIcon !== (category.icon || "tag");
      setHasChanges(changed);
    }
  }, [name, selectedColor, selectedIcon, category]);

  const handleUpdate = async () => {
    if (!category || category.is_system) return;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: category.id,
        data: {
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
        },
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update category. Please try again.");
    }
  };

  const handleDelete = () => {
    if (!category || category.is_system) return;

    if (otherCategories.length === 0) {
      Alert.alert(
        "Delete Category",
        "This will permanently delete this category. Any transactions using it will become uncategorized.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync({ id: category.id });
                router.back();
              } catch (error) {
                Alert.alert("Error", "Failed to delete category.");
              }
            },
          },
        ]
      );
    } else {
      // Show options to reassign or just delete
      Alert.alert(
        "Delete Category",
        "What should happen to transactions using this category?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Make Uncategorized",
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync({ id: category.id });
                router.back();
              } catch (error) {
                Alert.alert("Error", "Failed to delete category.");
              }
            },
          },
          {
            text: "Choose Category...",
            onPress: () => showReassignPicker(),
          },
        ]
      );
    }
  };

  const showReassignPicker = () => {
    // Simple implementation using Alert with options
    const buttons = otherCategories.slice(0, 5).map((cat) => ({
      text: cat.name,
      onPress: async () => {
        try {
          await deleteMutation.mutateAsync({
            id: category!.id,
            options: { reassignTo: cat.id },
          });
          router.back();
        } catch (error) {
          Alert.alert("Error", "Failed to delete category.");
        }
      },
    }));

    buttons.push({ text: "Cancel", onPress: async () => {} });

    Alert.alert(
      "Reassign Transactions To",
      "Select a category for existing transactions",
      buttons as any
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Category not found</Text>
          <Pressable
            className="mt-4 rounded-lg bg-primary px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-medium text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isSystem = category.is_system;

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
                {isSystem ? "View Category" : "Edit Category"}
              </Text>
            </View>
            {!isSystem && hasChanges && (
              <Pressable
                className={`rounded-lg px-4 py-2 ${
                  updateMutation.isPending ? "bg-primary/50" : "bg-primary"
                }`}
                onPress={handleUpdate}
                disabled={updateMutation.isPending}
              >
                <Text className="font-medium text-white">
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* System Category Notice */}
          {isSystem && (
            <View className="mb-4 flex-row items-center rounded-xl bg-amber-500/10 p-3">
              <FontAwesome name="lock" size={16} color="#f59e0b" />
              <Text className="ml-2 flex-1 text-amber-600">
                System categories cannot be edited or deleted
              </Text>
            </View>
          )}

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
              {category.type === "expense" ? "Expense" : "Income"}
              {isSystem && " • System"}
            </Text>
          </View>

          {/* Name Input */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Name
            </Text>
            <TextInput
              className={`rounded-xl p-4 text-foreground ${
                isSystem ? "bg-muted/50" : "bg-muted"
              }`}
              placeholder="Enter category name"
              placeholderTextColor={Colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isSystem}
            />
          </View>

          {/* Type (Read-only) */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Type
            </Text>
            <View className="flex-row gap-3">
              <View
                className={`flex-1 rounded-xl p-4 ${
                  category.type === "expense" ? "bg-red-500/10" : "bg-muted/50"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome
                    name="arrow-circle-up"
                    size={18}
                    color={
                      category.type === "expense"
                        ? "#ef4444"
                        : Colors.mutedForeground
                    }
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      category.type === "expense"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    Expense
                  </Text>
                </View>
              </View>
              <View
                className={`flex-1 rounded-xl p-4 ${
                  category.type === "income" ? "bg-green-500/10" : "bg-muted/50"
                }`}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome
                    name="arrow-circle-down"
                    size={18}
                    color={
                      category.type === "income"
                        ? "#22c55e"
                        : Colors.mutedForeground
                    }
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      category.type === "income"
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    Income
                  </Text>
                </View>
              </View>
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
                  style={{
                    backgroundColor: color,
                    opacity: isSystem ? 0.5 : 1,
                  }}
                  onPress={() => !isSystem && setSelectedColor(color)}
                  disabled={isSystem}
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
                  style={{ opacity: isSystem ? 0.5 : 1 }}
                  onPress={() => !isSystem && setSelectedIcon(icon)}
                  disabled={isSystem}
                >
                  <FontAwesome
                    name={icon as "tag"}
                    size={18}
                    color={
                      selectedIcon === icon ? "white" : Colors.mutedForeground
                    }
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Delete Button */}
          {!isSystem && (
            <Pressable
              className="mt-4 flex-row items-center justify-center rounded-xl bg-destructive/10 p-4"
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <FontAwesome name="trash" size={16} color={Colors.destructive} />
              <Text className="ml-2 font-medium text-destructive">
                {deleteMutation.isPending ? "Deleting..." : "Delete Category"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
