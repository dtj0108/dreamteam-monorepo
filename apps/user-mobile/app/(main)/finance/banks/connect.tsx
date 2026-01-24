import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import {
  create,
  dismissLink,
  LinkExit,
  LinkSuccess,
  open,
} from "react-native-plaid-link-sdk";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useCreateLinkToken, useExchangeToken } from "@/lib/hooks/usePlaid";

type ConnectionState = "loading" | "ready" | "linking" | "exchanging" | "success" | "error";

export default function ConnectBankScreen() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const createLinkToken = useCreateLinkToken();
  const exchangeToken = useExchangeToken();

  const [state, setState] = useState<ConnectionState>("loading");
  const [error, setError] = useState<string | null>(null);

  const isUpdateMode = !!itemId;

  useEffect(() => {
    initializePlaidLink();
    return () => {
      dismissLink();
    };
  }, []);

  const initializePlaidLink = async () => {
    try {
      setState("loading");
      setError(null);

      // Get link token from backend
      // Note: For update mode, we'd need to pass the access token
      // The backend should handle this based on itemId
      const response = await createLinkToken.mutateAsync(
        itemId ? { accessToken: itemId } : undefined
      );

      // Create Plaid Link configuration
      create({ token: response.linkToken });

      setState("ready");

      // Auto-open Plaid Link
      openPlaidLink();
    } catch (err) {
      console.error("Failed to create link token:", err);
      setError("Failed to initialize bank connection. Please try again.");
      setState("error");
    }
  };

  const openPlaidLink = () => {
    setState("linking");

    open({
      onSuccess: handleSuccess,
      onExit: handleExit,
    });
  };

  const handleSuccess = async (success: LinkSuccess) => {
    try {
      setState("exchanging");

      await exchangeToken.mutateAsync({
        publicToken: success.publicToken,
        institutionId: success.metadata.institution?.id,
        institutionName: success.metadata.institution?.name,
      });

      setState("success");

      // Small delay to show success state, then navigate back
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      console.error("Failed to exchange token:", err);
      setError("Failed to complete bank connection. Please try again.");
      setState("error");
    }
  };

  const handleExit = (exit: LinkExit) => {
    if (exit.error) {
      console.error("Plaid Link error:", exit.error);
      setError(exit.error.displayMessage || "Connection was cancelled.");
    }

    // If user cancelled without completing, go back
    if (state === "linking") {
      router.back();
    }
  };

  const handleRetry = () => {
    initializePlaidLink();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="times" size={20} color={Colors.foreground} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          {isUpdateMode ? "Fix Connection" : "Connect Bank"}
        </Text>
        <View className="w-5" />
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        {state === "loading" && (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="mt-4 text-center text-muted-foreground">
              Preparing secure connection...
            </Text>
          </>
        )}

        {state === "ready" && (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FontAwesome name="university" size={36} color={Colors.primary} />
            </View>
            <Text className="mt-4 text-lg font-semibold text-foreground">
              Ready to Connect
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              You'll be redirected to securely connect your bank account.
            </Text>
            <Pressable
              className="mt-6 rounded-xl bg-primary px-8 py-3"
              onPress={openPlaidLink}
            >
              <Text className="font-medium text-white">Open Bank Login</Text>
            </Pressable>
          </>
        )}

        {state === "linking" && (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="mt-4 text-center text-muted-foreground">
              Complete the connection in the popup...
            </Text>
          </>
        )}

        {state === "exchanging" && (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="mt-4 text-center text-muted-foreground">
              Setting up your accounts...
            </Text>
          </>
        )}

        {state === "success" && (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <FontAwesome name="check-circle" size={40} color="#22c55e" />
            </View>
            <Text className="mt-4 text-lg font-semibold text-foreground">
              Bank Connected!
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              Your accounts are now syncing automatically.
            </Text>
          </>
        )}

        {state === "error" && (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <FontAwesome name="exclamation-circle" size={40} color="#ef4444" />
            </View>
            <Text className="mt-4 text-lg font-semibold text-foreground">
              Connection Failed
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              {error || "Something went wrong. Please try again."}
            </Text>
            <View className="mt-6 flex-row gap-3">
              <Pressable
                className="rounded-xl bg-muted px-6 py-3"
                onPress={() => router.back()}
              >
                <Text className="font-medium text-foreground">Cancel</Text>
              </Pressable>
              <Pressable
                className="rounded-xl bg-primary px-6 py-3"
                onPress={handleRetry}
              >
                <Text className="font-medium text-white">Try Again</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Footer Note */}
      <View className="items-center px-8 pb-8">
        <View className="flex-row items-center">
          <FontAwesome name="lock" size={12} color={Colors.mutedForeground} />
          <Text className="ml-2 text-xs text-muted-foreground">
            Bank-grade encryption. We never see your login credentials.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
