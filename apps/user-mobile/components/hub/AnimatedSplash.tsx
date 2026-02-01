import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Updates from "expo-updates";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
} from "react-native-reanimated";

interface AnimatedSplashProps {
  onComplete: () => void;
}

// Minimum time to show splash for a polished feel
const MINIMUM_SPLASH_DURATION = 2500;

export function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  const lottieRef = useRef<LottieView>(null);
  const [updateCheckComplete, setUpdateCheckComplete] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

  // Reanimated scale value for subtle bounce effect
  const scale = useSharedValue(0.9);

  // Animated style for the scale transform
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Start subtle scale animation on mount
  useEffect(() => {
    scale.value = withSequence(
      // Gentle scale up with slight overshoot
      withSpring(1.03, { damping: 12, stiffness: 100 }),
      // Settle to normal size
      withSpring(1.0, { damping: 15, stiffness: 80 })
    );
  }, []);

  // Ensure minimum splash duration for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, MINIMUM_SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Check for OTA updates during splash
  useEffect(() => {
    async function checkForUpdates() {
      // In dev mode, skip update check
      if (__DEV__ || !Updates.isEnabled) {
        setUpdateCheckComplete(true);
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

      setUpdateCheckComplete(true);
    }
    checkForUpdates();
  }, []);

  // Complete when both minimum time elapsed and update check is done
  useEffect(() => {
    if (updateCheckComplete && minimumTimeElapsed) {
      onComplete();
    }
  }, [updateCheckComplete, minimumTimeElapsed, onComplete]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animationContainer, animatedStyle]}>
        <LottieView
          ref={lottieRef}
          source={require("../../ai-sphere-animation.json")}
          autoPlay
          loop={false}
          speed={3}
          style={styles.animation}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  animationContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    width: 200,
    height: 200,
  },
});
