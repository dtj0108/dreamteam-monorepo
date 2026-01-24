// Setup streaming polyfills before any other imports
import { setupPolyfills } from "@/lib/polyfills";
setupPolyfills();

import "../global.css";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AnimatedSplash } from "@/components/hub/AnimatedSplash";
import { PushPermissionModal } from "@/components/notifications/PushPermissionModal";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";
import { TeamProvider } from "@/providers/team-provider";
import { AgentsProvider } from "@/providers/agents-provider";
import { MeetingProvider } from "@/providers/meeting-provider";
import {
  NotificationProvider,
  useNotifications,
} from "@/providers/notification-provider";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// Component to handle push notification permission prompt
// Must be rendered inside NotificationProvider
function PushPermissionPrompt({
  isReady,
  isAuthenticated,
}: {
  isReady: boolean;
  isAuthenticated: boolean;
}) {
  const { expoPushToken, requestPermissions } = useNotifications();
  const [showModal, setShowModal] = useState(false);

  // Show modal when ready, authenticated, and no push token
  useEffect(() => {
    if (isReady && isAuthenticated && !expoPushToken) {
      // Small delay to ensure smooth transition after splash
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, isAuthenticated, expoPushToken]);

  const handleEnable = async () => {
    await requestPermissions();
    setShowModal(false);
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  return (
    <PushPermissionModal
      visible={showModal}
      onEnable={handleEnable}
      onDismiss={handleDismiss}
    />
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore splash screen errors
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Track animated splash completion
  const [splashComplete, setSplashComplete] = useState(false);

  // Ready when BOTH auth loaded AND splash done
  const isReady = !isLoading && splashComplete;

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Redirect to welcome if not authenticated
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace("/(main)/hub");
    }
  }, [session, segments, isReady, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <WorkspaceProvider>
          <AgentsProvider>
            <NotificationProvider>
              <TeamProvider>
              <MeetingProvider>
                {/* Always render Slot - screens pre-mount behind splash */}
                <Slot />

                {/* Animated splash overlay until ready */}
                {!isReady && (
                  <AnimatedSplash onComplete={() => setSplashComplete(true)} />
                )}

                {/* Push notification permission prompt */}
                <PushPermissionPrompt
                  isReady={isReady}
                  isAuthenticated={!!session}
                />
              </MeetingProvider>
              </TeamProvider>
            </NotificationProvider>
          </AgentsProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
