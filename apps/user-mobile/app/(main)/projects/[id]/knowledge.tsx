import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
  useProject,
  useProjectKnowledgeLinks,
  useUnlinkKnowledgePage,
  useLinkKnowledgePage,
} from "../../../../lib/hooks/useProjects";
import { usePages } from "../../../../lib/hooks/useKnowledge";

export default function ProjectKnowledgeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const { data: project, isLoading: projectLoading } = useProject(id);
  const {
    data: linksData,
    isLoading: linksLoading,
    refetch: refetchLinks,
  } = useProjectKnowledgeLinks(id);
  const links = linksData?.links || [];

  // Fetch all pages for linking
  const { data: pagesData, isLoading: pagesLoading } = usePages();
  const allPages = pagesData?.pages || [];

  // Filter pages not already linked and by search
  const availablePages = allPages.filter((page) => {
    const isLinked = links.some((link) => link.page_id === page.id);
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    return !isLinked && matchesSearch && !page.is_archived;
  });

  // Mutations
  const linkPage = useLinkKnowledgePage(id);
  const unlinkPage = useUnlinkKnowledgePage(id);

  const handleLinkPage = async (pageId: string) => {
    try {
      await linkPage.mutateAsync(pageId);
      setShowLinkModal(false);
      setSearchQuery("");
    } catch (error) {
      Alert.alert("Error", "Failed to link page. Please try again.");
    }
  };

  const handleUnlinkPage = (linkId: string, pageTitle: string) => {
    Alert.alert(
      "Remove Link",
      `Are you sure you want to remove "${pageTitle}" from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkPage.mutateAsync(linkId);
            } catch (error) {
              Alert.alert("Error", "Failed to remove link. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleViewPage = (pageId: string) => {
    // Navigate to knowledge page viewer
    router.push({
      pathname: "/(main)/more/knowledge/[id]",
      params: { id: pageId },
    });
  };

  const isLoading = projectLoading || linksLoading;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <FontAwesome name="exclamation-circle" size={48} color="#d1d5db" />
        <Text className="mt-4 text-lg font-medium text-foreground">
          Project not found
        </Text>
        <Pressable
          className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-70"
          onPress={() => router.back()}
        >
          <Text className="font-medium text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Knowledge",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#fafafa" },
          headerRight: () => (
            <Pressable
              onPress={() => setShowLinkModal(true)}
              className="mr-2 flex-row items-center"
            >
              <FontAwesome name="plus" size={14} color="#0ea5e9" />
              <Text className="ml-1 font-medium text-primary">Link</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetchLinks()} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-foreground">
            Linked Knowledge Pages
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Documentation and resources linked to this project
          </Text>
        </View>

        {/* Links List */}
        <View className="px-4">
          {links.length === 0 ? (
            <View className="items-center rounded-xl bg-muted py-12">
              <FontAwesome name="file-text-o" size={48} color="#d1d5db" />
              <Text className="mt-4 text-lg font-medium text-foreground">
                No linked pages
              </Text>
              <Text className="mt-1 text-center text-muted-foreground">
                Link knowledge pages to keep documentation organized with your project
              </Text>
              <Pressable
                className="mt-4 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-70"
                onPress={() => setShowLinkModal(true)}
              >
                <FontAwesome name="link" size={14} color="white" />
                <Text className="ml-2 font-medium text-white">Link a Page</Text>
              </Pressable>
            </View>
          ) : (
            <View className="rounded-xl bg-muted overflow-hidden">
              {links.map((link, index) => (
                <Pressable
                  key={link.id}
                  className={`flex-row items-center p-4 active:bg-gray-200 ${
                    index > 0 ? "border-t border-gray-200" : ""
                  }`}
                  onPress={() => handleViewPage(link.page_id)}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-white">
                    {link.page?.icon ? (
                      <Text className="text-lg">{link.page.icon}</Text>
                    ) : (
                      <FontAwesome name="file-text-o" size={18} color="#6b7280" />
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-foreground" numberOfLines={1}>
                      {link.page?.title || "Untitled"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Linked {new Date(link.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Pressable
                    className="p-2"
                    onPress={() =>
                      handleUnlinkPage(link.id, link.page?.title || "this page")
                    }
                  >
                    <FontAwesome name="unlink" size={16} color="#9ca3af" />
                  </Pressable>
                  <FontAwesome
                    name="chevron-right"
                    size={12}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Link Count */}
        {links.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-sm text-muted-foreground">
              {links.length} page{links.length === 1 ? "" : "s"} linked
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Link Page Modal */}
      <Modal
        visible={showLinkModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowLinkModal(false);
          setSearchQuery("");
        }}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
            <Pressable
              onPress={() => {
                setShowLinkModal(false);
                setSearchQuery("");
              }}
            >
              <Text className="text-primary">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-foreground">
              Link Knowledge Page
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Search */}
          <View className="px-4 py-3">
            <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
              <FontAwesome name="search" size={14} color="#9ca3af" />
              <TextInput
                className="ml-2 flex-1 text-foreground"
                placeholder="Search pages..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <FontAwesome name="times-circle" size={14} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Available Pages */}
          <ScrollView className="flex-1 px-4">
            {pagesLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#0ea5e9" />
              </View>
            ) : availablePages.length === 0 ? (
              <View className="items-center py-8">
                <FontAwesome name="file-o" size={32} color="#d1d5db" />
                <Text className="mt-4 text-muted-foreground">
                  {searchQuery
                    ? "No matching pages found"
                    : allPages.length === 0
                    ? "No knowledge pages available"
                    : "All pages are already linked"}
                </Text>
              </View>
            ) : (
              <View className="rounded-xl bg-muted overflow-hidden">
                {availablePages.map((page, index) => (
                  <Pressable
                    key={page.id}
                    className={`flex-row items-center p-4 active:bg-gray-200 ${
                      index > 0 ? "border-t border-gray-200" : ""
                    }`}
                    onPress={() => handleLinkPage(page.id)}
                    disabled={linkPage.isPending}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-white">
                      {page.icon ? (
                        <Text className="text-lg">{page.icon}</Text>
                      ) : (
                        <FontAwesome name="file-text-o" size={18} color="#6b7280" />
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-foreground" numberOfLines={1}>
                        {page.title || "Untitled"}
                      </Text>
                    </View>
                    {linkPage.isPending ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : (
                      <FontAwesome name="link" size={14} color="#0ea5e9" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
