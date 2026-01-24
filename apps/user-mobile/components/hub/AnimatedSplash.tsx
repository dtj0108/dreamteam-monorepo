import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import * as Updates from "expo-updates";

interface AnimatedSplashProps {
  onComplete: () => void;
}

export function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  // Check for OTA updates during splash, then complete
  useEffect(() => {
    async function checkForUpdates() {
      // In dev mode, complete immediately (no update check)
      if (__DEV__ || !Updates.isEnabled) {
        onComplete();
        return;
      }

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // App reloads with new version
        }
      } catch (e) {
        console.log("Update check failed:", e);
      }

      // Done checking (or no update available), dismiss splash
      onComplete();
    }
    checkForUpdates();
  }, [onComplete]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    zIndex: 100,
  },
});
