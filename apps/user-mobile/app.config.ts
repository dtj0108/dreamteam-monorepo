import { ExpoConfig, ConfigContext } from "expo/config";

// Import the static config from app.json
import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => ({
  // Spread all existing config from app.json
  ...appJson.expo,
  // Override extra to include environment variables from EAS Secrets
  extra: {
    ...appJson.expo.extra,
    // This will be injected from EAS Secrets during cloud builds
    // or from .env during local development
    XAI_API_KEY: process.env.EXPO_PUBLIC_XAI_API_KEY,
  },
});
