import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryBadge } from "@/components/knowledge/CategoryBadge";
import { PageHeader } from "@/components/knowledge/PageHeader";
import { RichTextEditor } from "@/components/knowledge/RichTextEditor";
import { Colors } from "@/constants/Colors";
import {
  usePage,
  useUpdatePage,
  useDeletePage,
  useTogglePageFavorite,
} from "@/lib/hooks/useKnowledge";
import { BlockNoteContent } from "@/lib/types/knowledge";

export default function PageEditorScreen() {
  const { pageId } = useLocalSearchParams<{ pageId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);

  const { data: page, isLoading, error } = usePage(pageId);
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const toggleFavorite = useTogglePageFavorite();

  const handleTitleChange = useCallback(
    (title: string) => {
      if (pageId) {
        setIsSaving(true);
        updatePage.mutate(
          { id: pageId, data: { title } },
          {
            onSettled: () => setIsSaving(false),
          }
        );
      }
    },
    [pageId, updatePage]
  );

  const handleContentChange = useCallback(
    (content: BlockNoteContent) => {
      if (pageId) {
        setIsSaving(true);
        updatePage.mutate(
          { id: pageId, data: { content } },
          {
            onSettled: () => setIsSaving(false),
          }
        );
      }
    },
    [pageId, updatePage]
  );

  const handleToggleFavorite = useCallback(() => {
    if (pageId) {
      toggleFavorite.mutate(pageId);
    }
  }, [pageId, toggleFavorite]);

  const handleDelete = useCallback(() => {
    if (pageId) {
      deletePage.mutate(
        { id: pageId },
        {
          onSuccess: () => {
            router.back();
          },
        }
      );
    }
  }, [pageId, deletePage, router]);

  const handleArchive = useCallback(() => {
    if (pageId) {
      setIsSaving(true);
      updatePage.mutate(
        { id: pageId, data: { is_archived: !page?.is_archived } },
        {
          onSettled: () => setIsSaving(false),
          onSuccess: () => {
            if (!page?.is_archived) {
              router.back();
            }
          },
        }
      );
    }
  }, [pageId, updatePage, page?.is_archived, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !page) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-lg font-semibold text-foreground">
          Page not found
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          The page you're looking for doesn't exist or has been deleted.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <PageHeader
          page={page}
          onTitleChange={handleTitleChange}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onArchive={handleArchive}
          isSaving={isSaving}
        />
      </View>

      {/* Categories Row */}
      {page.categories.length > 0 && (
        <View className="border-b border-border px-4 py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {page.categories.map((category) => (
              <CategoryBadge key={category.id} category={category} size="sm" />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View className="flex-1">
        <RichTextEditor
          initialContent={page.content}
          onContentChange={handleContentChange}
          editable={!isSaving}
        />
      </View>
    </View>
  );
}
