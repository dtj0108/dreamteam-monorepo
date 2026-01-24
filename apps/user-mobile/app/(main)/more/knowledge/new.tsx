import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryBadge } from "@/components/knowledge/CategoryBadge";
import { Colors } from "@/constants/Colors";
import {
  useCategories,
  useCreatePage,
  useTemplates,
} from "@/lib/hooks/useKnowledge";
import { KnowledgeCategory, KnowledgeTemplate } from "@/lib/types/knowledge";

export default function NewPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const { data: categoriesData } = useCategories();
  const { data: templates } = useTemplates();
  const createPage = useCreatePage();

  const categories = categoriesData?.categories || [];

  const handleClose = () => {
    router.back();
  };

  const handleCreate = async () => {
    createPage.mutate(
      {
        title: title.trim() || "Untitled",
        template_id: selectedTemplateId || undefined,
      },
      {
        onSuccess: (newPage) => {
          // Navigate to the new page
          router.replace(`/(main)/more/knowledge/${newPage.id}`);
        },
      }
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectedCategories = categories.filter((cat) =>
    selectedCategoryIds.includes(cat.id)
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleClose}
            className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
          >
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </Pressable>

          <Text className="text-lg font-semibold text-foreground">
            New Page
          </Text>

          <Pressable
            onPress={handleCreate}
            disabled={createPage.isPending}
            className="rounded-lg bg-primary px-4 py-2 active:opacity-80 disabled:opacity-50"
          >
            {createPage.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="font-semibold text-white">Create</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        {/* Title Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Page title"
            placeholderTextColor={Colors.mutedForeground}
            className="rounded-lg bg-muted px-4 py-3 text-base text-foreground"
            autoFocus
          />
        </View>

        {/* Categories */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            Categories (optional)
          </Text>

          {selectedCategories.length > 0 && (
            <View className="mb-2 flex-row flex-wrap gap-2">
              {selectedCategories.map((cat) => (
                <CategoryBadge
                  key={cat.id}
                  category={cat}
                  onRemove={() => toggleCategory(cat.id)}
                />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            className="flex-row items-center rounded-lg bg-muted px-4 py-3 active:opacity-70"
          >
            <FontAwesome
              name="plus"
              size={14}
              color={Colors.mutedForeground}
            />
            <Text className="ml-2 text-muted-foreground">
              {selectedCategories.length > 0
                ? "Add more categories"
                : "Add categories"}
            </Text>
          </Pressable>

          {showCategoryPicker && (
            <View className="mt-2 rounded-lg border border-border bg-background p-2">
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  className="flex-row items-center rounded-md p-2 active:bg-muted"
                >
                  <View
                    className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                      selectedCategoryIds.includes(cat.id)
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {selectedCategoryIds.includes(cat.id) && (
                      <FontAwesome name="check" size={12} color="#ffffff" />
                    )}
                  </View>
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color || "#6b7280" }}
                  />
                  <Text className="ml-2 text-foreground">{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Templates */}
        {templates && templates.length > 0 && (
          <View>
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Start from template (optional)
            </Text>

            <View className="gap-2">
              {/* Blank page option */}
              <TemplateOption
                name="Blank page"
                description="Start with an empty page"
                icon="📄"
                isSelected={selectedTemplateId === null}
                onPress={() => setSelectedTemplateId(null)}
              />

              {/* Template options */}
              {templates.map((template) => (
                <TemplateOption
                  key={template.id}
                  name={template.name}
                  description={template.description || undefined}
                  icon={template.icon || "📋"}
                  isSelected={selectedTemplateId === template.id}
                  onPress={() => setSelectedTemplateId(template.id)}
                  usageCount={template.usage_count}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface TemplateOptionProps {
  name: string;
  description?: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  usageCount?: number;
}

function TemplateOption({
  name,
  description,
  icon,
  isSelected,
  onPress,
  usageCount,
}: TemplateOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-lg border p-3 active:opacity-70 ${
        isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-medium text-foreground">{name}</Text>
        {description && (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      {usageCount !== undefined && usageCount > 0 && (
        <Text className="text-xs text-muted-foreground">
          Used {usageCount}x
        </Text>
      )}
      {isSelected && (
        <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-primary">
          <FontAwesome name="check" size={12} color="#ffffff" />
        </View>
      )}
    </Pressable>
  );
}
