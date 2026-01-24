import { AuthError } from "@supabase/supabase-js";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Logo } from "@/components/Logo";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/providers/auth-provider";

export default function SignupScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Name is required";
    }
    if (!email.trim()) {
      return "Email is required";
    }
    if (!email.includes("@")) {
      return "Please enter a valid email address";
    }
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="mb-10">
            <Logo size="lg" />
            <Text className="mt-3 text-center text-muted-foreground">
              Create your account
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
                Name
              </Text>
              <TextInput
                className="rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                placeholder="John Doe"
                placeholderTextColor={Colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                editable={!isLoading}
              />
            </View>

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
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                editable={!isLoading}
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-foreground">
                Phone{" "}
                <Text className="font-normal text-muted-foreground">
                  (optional)
                </Text>
              </Text>
              <TextInput
                className="rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                placeholder="+1234567890"
                placeholderTextColor={Colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                editable={!isLoading}
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-foreground">
                Company Name{" "}
                <Text className="font-normal text-muted-foreground">
                  (optional)
                </Text>
              </Text>
              <TextInput
                className="rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                placeholder="Acme Inc"
                placeholderTextColor={Colors.mutedForeground}
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
                textContentType="organizationName"
                editable={!isLoading}
              />
            </View>

            <Pressable
              className={`mt-4 rounded-lg py-4 ${
                isLoading ? "bg-primary/70" : "bg-primary"
              }`}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-base font-semibold text-primary-foreground">
                  Create Account
                </Text>
              )}
            </Pressable>
          </View>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-muted-foreground">
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="font-semibold text-primary">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
