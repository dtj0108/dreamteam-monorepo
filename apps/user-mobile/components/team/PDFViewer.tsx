import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";

interface PDFViewerProps {
  url: string;
  filename: string;
  visible: boolean;
  onClose: () => void;
}

export function PDFViewer({ url, filename, visible, onClose }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        // On web, open in new tab
        window.open(url, "_blank");
      } else {
        await Share.share({
          url: url,
          title: filename,
        });
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleDownload = async () => {
    if (Platform.OS === "web") {
      // On web, trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    } else {
      // On native, open in browser for download
      await Linking.openURL(url);
    }
  };

  if (Platform.OS === "web") {
    // Web implementation using iframe
    if (!visible) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#1f2937",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
            }}
          >
            <Ionicons name="close" size={24} color="white" />
            Close
          </button>
          <span
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: 500,
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {filename}
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleDownload}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <Ionicons name="download-outline" size={24} color="white" />
            </button>
            <button
              onClick={handleShare}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <Ionicons name="open-outline" size={24} color="white" />
            </button>
          </div>
        </div>
        {/* PDF iframe */}
        <iframe
          src={url}
          style={{
            flex: 1,
            border: "none",
            backgroundColor: "white",
          }}
          title={filename}
        />
      </div>
    );
  }

  // Native implementation using WebView
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-900">
        {/* Header */}
        <View
          className="flex-row items-center justify-between bg-gray-800 px-4"
          style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
        >
          <Pressable
            className="flex-row items-center"
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="white" />
            <Text className="ml-2 text-base font-medium text-white">Close</Text>
          </Pressable>

          <Text
            className="flex-1 mx-4 text-center text-base font-medium text-white"
            numberOfLines={1}
          >
            {filename}
          </Text>

          <View className="flex-row items-center">
            <Pressable className="p-2" onPress={handleDownload} hitSlop={8}>
              <Ionicons name="download-outline" size={22} color="white" />
            </Pressable>
            <Pressable className="p-2" onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color="white" />
            </Pressable>
          </View>
        </View>

        {/* PDF Content */}
        <View className="flex-1">
          {isLoading && (
            <View className="absolute inset-0 items-center justify-center bg-gray-900">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text className="mt-4 text-gray-400">Loading PDF...</Text>
            </View>
          )}

          {error ? (
            <View className="flex-1 items-center justify-center p-8">
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text className="mt-4 text-center text-lg text-white">
                Failed to load PDF
              </Text>
              <Text className="mt-2 text-center text-gray-400">{error}</Text>
              <Pressable
                className="mt-6 rounded-lg bg-primary px-6 py-3"
                onPress={handleDownload}
              >
                <Text className="font-medium text-white">
                  Open in Browser
                </Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              source={{ uri: url }}
              style={{ flex: 1, backgroundColor: "#1f2937" }}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={(e) => {
                setIsLoading(false);
                setError(e.nativeEvent.description || "Unknown error");
              }}
              // Enable zooming
              scalesPageToFit
              bounces={false}
              // iOS specific
              allowsInlineMediaPlayback
              // Android specific
              mixedContentMode="compatibility"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
