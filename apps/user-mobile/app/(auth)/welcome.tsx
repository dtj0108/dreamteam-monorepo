import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";

import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: "flash-outline" as const, text: "AI agents that handle your tasks" },
  { icon: "time-outline" as const, text: "Available around the clock" },
  { icon: "shield-checkmark-outline" as const, text: "Secure & private by design" },
];

export default function WelcomeScreen() {
  const router = useRouter();

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(20)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const animationSequence = Animated.sequence([
      // 1. Logo fades in + scales up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3. Features slide up + fade in
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(featuresTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 4. Bottom section slides up + fades in
      Animated.parallel([
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start();
  }, []);

  const handleContinue = () => {
    router.push("/(auth)/login");
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#f0f9ff", "#e0f2fe", "#bae6fd"]}
      locations={[0, 0.3, 0.7, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* Hero section */}
        <View className="flex-1 items-center justify-center px-8">
          {/* Logo with Lottie animation */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
            className="items-center"
          >
            <View style={styles.lottieContainer}>
              <LottieView
                source={require("../../ai-sphere-animation.json")}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>
            <View className="mt-6">
              <Logo size="lg" />
            </View>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: taglineOpacity }} className="mt-3">
            <Text className="text-center text-xl font-medium text-gray-600">
              Your AI-powered business command center
            </Text>
          </Animated.View>

          {/* Feature highlights */}
          <Animated.View
            style={{
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslateY }],
            }}
            className="mt-10 items-center"
          >
            <View style={styles.featuresContainer}>
              {FEATURES.map((feature, index) => (
                <View key={index} className="mb-4 flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name={feature.icon} size={20} color="#0ea5e9" />
                  </View>
                  <Text style={styles.featureText} className="text-base text-gray-700">
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Bottom section */}
        <Animated.View
          style={{
            opacity: bottomOpacity,
            transform: [{ translateY: bottomTranslateY }],
          }}
          className="px-6 pb-8"
        >
          {/* Continue button */}
          <Pressable
            onPress={handleContinue}
            style={styles.continueButton}
            className="active:opacity-90"
          >
            <Text className="text-center text-lg font-semibold text-white">
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
          </Pressable>

          {/* Terms text */}
          <Text className="mt-4 text-center text-xs text-gray-500">
            By continuing, you agree to our{" "}
            <Text 
              className="text-primary underline"
              onPress={() => Linking.openURL("https://dreamteam.ai/terms")}
            >
              Terms of Service
            </Text>
            {" "}and{" "}
            <Text 
              className="text-primary underline"
              onPress={() => Linking.openURL("https://dreamteam.ai/privacy")}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  lottieContainer: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: 240,
    height: 240,
  },
  featuresContainer: {
    alignItems: "flex-start",
  },
  featureText: {
    width: 220,
  },
  continueButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
