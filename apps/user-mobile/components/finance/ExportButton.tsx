import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  label?: string;
  compact?: boolean;
}

export function ExportButton({
  onExport,
  label = "Export CSV",
  compact = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  if (compact) {
    return (
      <Pressable
        className="h-10 w-10 items-center justify-center rounded-full bg-muted"
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <FontAwesome name="download" size={16} color={Colors.primary} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      className={`flex-row items-center justify-center rounded-xl bg-primary/10 py-3 px-4 ${
        isExporting ? "opacity-50" : ""
      }`}
      onPress={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <>
          <FontAwesome name="download" size={16} color={Colors.primary} />
          <Text className="ml-2 font-medium text-primary">{label}</Text>
        </>
      )}
    </Pressable>
  );
}
