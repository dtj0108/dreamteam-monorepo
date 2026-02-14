import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from "@/constants/legal-links";

const logoImage = require("../../dreamteamlogo.png");

export default function WelcomeScreen() {
  const router = useRouter();

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const animationSequence = Animated.sequence([
      // 1. Logo fades in + scales up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
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
      // 3. Bottom section slides up + fades in
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

    // Continuous slow rotation for logo
    const spinAnimation = Animated.loop(
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, []);

  const handleContinue = () => {
    router.push("/(auth)/login");
  };

  const handleOpenLegalUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#f0f9ff", "#e0f2fe"]}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* Centered content */}
        <View className="flex-1 items-center justify-center px-8">
          {/* Logo with animation */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
            className="items-center"
          >
            <Animated.Image
              source={logoImage}
              style={{
                width: 120,
                height: 120,
                transform: [
                  {
                    rotate: logoRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
              resizeMode="contain"
            />
            <View className="mt-4">
              <Logo size="lg" />
            </View>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: taglineOpacity }}>
            <Text className="mt-4 text-center text-lg text-muted-foreground">
              the AI that works for you, 24/7
            </Text>
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
          {/* Terms text */}
          <Text className="mb-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Text
              className="text-primary underline"
              onPress={() => handleOpenLegalUrl(LEGAL_TERMS_URL)}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              className="text-primary underline"
              onPress={() => handleOpenLegalUrl(LEGAL_PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Continue button */}
          <Pressable
            onPress={handleContinue}
            className="rounded-full bg-primary py-4 active:opacity-90"
          >
            <Text className="text-center text-base font-semibold text-white">
              Continue
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}
