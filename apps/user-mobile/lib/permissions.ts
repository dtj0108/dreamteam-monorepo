import { Alert, Platform } from "react-native";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";

/**
 * Request camera and microphone permissions for video calling
 * @returns true if all permissions granted, false otherwise
 */
export async function requestMediaPermissions(): Promise<boolean> {
  try {
    // Request camera permission (includes microphone on iOS)
    const cameraResponse = await Camera.requestCameraPermissionsAsync();

    if (cameraResponse.status !== "granted") {
      showPermissionDeniedAlert("camera");
      return false;
    }

    // Request microphone permission explicitly on Android
    if (Platform.OS === "android") {
      const microphoneResponse = await Camera.requestMicrophonePermissionsAsync();

      if (microphoneResponse.status !== "granted") {
        showPermissionDeniedAlert("microphone");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

/**
 * Check if camera and microphone permissions are granted
 * @returns true if all permissions granted, false otherwise
 */
export async function checkMediaPermissions(): Promise<boolean> {
  try {
    const cameraResponse = await Camera.getCameraPermissionsAsync();

    if (cameraResponse.status !== "granted") {
      return false;
    }

    if (Platform.OS === "android") {
      const microphoneResponse = await Camera.getMicrophonePermissionsAsync();

      if (microphoneResponse.status !== "granted") {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Show an alert when permission is denied
 */
function showPermissionDeniedAlert(permissionType: "camera" | "microphone") {
  const messages = {
    camera: {
      title: "Camera Permission Required",
      message:
        "Please enable camera access in Settings to join video calls.",
    },
    microphone: {
      title: "Microphone Permission Required",
      message:
        "Please enable microphone access in Settings to join voice calls.",
    },
  };

  const { title, message } = messages[permissionType];

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Open Settings",
      onPress: () => {
        // Note: expo-linking could be used to open settings
        // For now, just inform the user
      },
    },
  ]);
}

/**
 * Request all permissions needed for the app
 * This can be called during onboarding or first launch
 */
export async function requestAllPermissions(): Promise<{
  camera: boolean;
  microphone: boolean;
}> {
  const camera = await Camera.requestCameraPermissionsAsync();
  const microphone =
    Platform.OS === "android"
      ? await Camera.requestMicrophonePermissionsAsync()
      : camera; // iOS grants mic with camera

  return {
    camera: camera.status === "granted",
    microphone: microphone.status === "granted",
  };
}
