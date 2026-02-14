import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import {
  submitSupportRequest,
  SupportRequestType,
  SupportUrgency,
} from "@/lib/api/support";

const REQUEST_TYPES: Array<{ value: SupportRequestType; label: string; emoji: string }> = [
  { value: "support", label: "Support", emoji: "💬" },
  { value: "bug", label: "Bug", emoji: "🐛" },
];

const URGENCY_OPTIONS: Array<{ value: SupportUrgency; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type SupportStep = 1 | 2 | 3 | 4;

export default function HubSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<SupportStep>(1);
  const [type, setType] = useState<SupportRequestType>("support");
  const [urgency, setUrgency] = useState<SupportUrgency>("medium");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      Alert.alert("Error", "Please enter a subject.");
      return;
    }

    if (!trimmedMessage) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSupportRequest({
        type,
        urgency,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      Alert.alert(
        "Sent",
        type === "bug"
          ? "Bug report sent. Our team will investigate."
          : "Support request sent. We will get back to you soon.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(main)/hub"),
          },
        ]
      );

      setSubject("");
      setMessage("");
      setType("support");
      setUrgency("medium");
      setStep(1);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send request. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext =
    (step !== 2 || subject.trim().length > 0) &&
    (step !== 4 || message.trim().length > 0);

  const handleNext = () => {
    if (step === 2 && subject.trim().length === 0) {
      Alert.alert("Error", "Please enter your main issue.");
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    void handleSubmit();
  };

  const handleBack = () => {
    if (step === 4) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(1);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="rounded-xl border border-border bg-background p-4">
        <Text className="text-lg font-semibold text-foreground">Support & Bugs</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Quick 4-step flow so we can route this correctly.
        </Text>
      </View>

      <View className="mt-4 flex-row items-center justify-center gap-2">
        {[1, 2, 3, 4].map((value) => {
          const active = value <= step;
          return (
            <View
              key={value}
              className={`h-1.5 rounded-full ${active ? "bg-primary" : "bg-border"}`}
              style={{ width: 34 }}
            />
          );
        })}
      </View>

      <View className="mt-4 rounded-xl border border-border bg-background p-4">
        {step === 1 && (
          <>
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 of 4: Support or Bug
            </Text>
            <View className="flex-row gap-2">
              {REQUEST_TYPES.map((option) => {
                const isSelected = option.value === type;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setType(option.value)}
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <Text className="text-center text-sm font-medium text-foreground">
                      {option.emoji} {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 2 of 4: Main Issue
            </Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={
                type === "bug"
                  ? "Brief description of the bug"
                  : "What do you need help with?"
              }
              placeholderTextColor={Colors.mutedForeground}
              className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
              editable={!isSubmitting}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 3 of 4: Urgency
            </Text>
            <View className="flex-row gap-2">
              {URGENCY_OPTIONS.map((option) => {
                const isSelected = option.value === urgency;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setUrgency(option.value)}
                    className={`flex-1 rounded-xl border px-3 py-3 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <Text className="text-center text-sm font-medium text-foreground">
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 4 of 4: Message
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              placeholder={
                type === "bug"
                  ? "Describe what happened, what you expected, and steps to reproduce."
                  : "Share the details so we can help quickly."
              }
              placeholderTextColor={Colors.mutedForeground}
              className="min-h-[140px] rounded-xl border border-border bg-background px-4 py-3 text-foreground"
              editable={!isSubmitting}
            />
          </>
        )}
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          onPress={handleBack}
          disabled={step === 1 || isSubmitting}
          className="flex-1 items-center justify-center rounded-xl border border-border px-4 py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-medium text-foreground">Back</Text>
        </Pressable>
        <Pressable
          onPress={handleNext}
          disabled={!canGoNext || isSubmitting}
          className="flex-1 flex-row items-center justify-center rounded-xl bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="ml-2 font-semibold text-white">Sending...</Text>
            </>
          ) : (
            <Text className="font-semibold text-white">
              {step === 4 ? "Send Request" : "Next"}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
