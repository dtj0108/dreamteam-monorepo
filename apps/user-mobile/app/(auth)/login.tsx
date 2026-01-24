import { AuthError } from "@supabase/supabase-js";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { Logo } from "@/components/Logo";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/providers/auth-provider";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      // Navigation handled automatically by auth state change in root layout
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-12">
          <Logo size="lg" />
          <Text className="mt-3 text-center text-muted-foreground">
            Sign in to your account
          </Text>
        </View>

        {error && (
          <View className="mb-4 rounded-lg bg-destructive/10 p-3">
            <Text className="text-center text-destructive">{error}</Text>
          </View>
        )}

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-foreground">
              Email
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              placeholder="you@example.com"
              placeholderTextColor={Colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-foreground">
              Password
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              placeholder="Enter your password"
              placeholderTextColor={Colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!isLoading}
            />
          </View>

          <Pressable
            className={`mt-4 rounded-lg py-4 ${
              isLoading ? "bg-primary/70" : "bg-primary"
            }`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-center text-base font-semibold text-primary-foreground">
                Continue
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-muted-foreground">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="font-semibold text-primary">Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

