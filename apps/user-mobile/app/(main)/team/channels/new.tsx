import { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { Colors } from "@/constants/Colors";
import { useCreateChannel } from "@/lib/hooks/useTeam";
import { ChannelType } from "@/lib/types/team";

export default function NewChannelScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const createChannelMutation = useCreateChannel();

  // Hide parent header
  useLayoutEffect(() => {
    navigation.getParent()?.getParent()?.setOptions({ headerShown: false });
    return () => {
      navigation.getParent()?.getParent()?.setOptions({ headerShown: true });
    };
  }, [navigation]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Validate channel name (lowercase, no spaces)
  const formatChannelName = useCallback((text: string) => {
    return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }, []);

  const handleNameChange = useCallback(
    (text: string) => {
      setName(formatChannelName(text));
    },
    [formatChannelName]
  );

  const isValid = name.length >= 2 && name.length <= 80;

  const handleCreate = useCallback(async () => {
    if (!isValid) return;

    try {
      const channel = await createChannelMutation.mutateAsync({
        name,
        description: description.trim() || undefined,
        type: isPrivate ? "private" : "public",
      });

      // Navigate to the new channel
      router.replace(`/(main)/team/channels/${channel.id}`);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create channel"
      );
    }
  }, [name, description, isPrivate, isValid, createChannelMutation, router]);

  const handleBack = () => {
    router.back();
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center border-b border-border px-4 py-3">
        <Pressable
          className="mr-3 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
          onPress={handleBack}
        >
          <FontAwesome name="times" size={18} color={Colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-foreground">
          Create Channel
        </Text>
        <Pressable
          className={`rounded-full px-4 py-2 ${
            isValid ? "bg-primary" : "bg-muted"
          }`}
          onPress={handleCreate}
          disabled={!isValid || createChannelMutation.isPending}
        >
          {createChannelMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text
              className={`font-medium ${
                isValid ? "text-white" : "text-muted-foreground"
              }`}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Channel Type */}
        <View className="mt-6">
          <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Channel Type
          </Text>
          <View className="flex-row items-center justify-between rounded-xl bg-muted p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-background">
                <FontAwesome
                  name={isPrivate ? "lock" : "hashtag"}
                  size={18}
                  color={Colors.foreground}
                />
              </View>
              <View className="ml-3">
                <Text className="font-semibold text-foreground">
                  {isPrivate ? "Private Channel" : "Public Channel"}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {isPrivate
                    ? "Only invited members can see this channel"
                    : "Anyone in the workspace can join"}
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Channel Name */}
        <View className="mt-6">
          <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Name
          </Text>
          <View className="flex-row items-center rounded-xl bg-muted px-4 py-3">
            <FontAwesome
              name={isPrivate ? "lock" : "hashtag"}
              size={16}
              color={Colors.mutedForeground}
            />
            <TextInput
              className="ml-2 flex-1 text-base text-foreground"
              placeholder="e.g. marketing, design-team"
              placeholderTextColor={Colors.mutedForeground}
              value={name}
              onChangeText={handleNameChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={80}
            />
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            Lowercase letters, numbers, and dashes only. {name.length}/80
          </Text>
        </View>

        {/* Description */}
        <View className="mt-6">
          <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Description (optional)
          </Text>
          <TextInput
            className="min-h-[100px] rounded-xl bg-muted px-4 py-3 text-base text-foreground"
            placeholder="What is this channel about?"
            placeholderTextColor={Colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={250}
          />
          <Text className="mt-1 text-xs text-muted-foreground">
            {description.length}/250
          </Text>
        </View>

        {/* Preview */}
        <View className="mt-6 mb-8">
          <Text className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Preview
          </Text>
          <View className="rounded-xl bg-muted p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-background">
                <FontAwesome
                  name={isPrivate ? "lock" : "hashtag"}
                  size={18}
                  color={Colors.foreground}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-foreground">
                  {name || "channel-name"}
                </Text>
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {description || "No description"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
