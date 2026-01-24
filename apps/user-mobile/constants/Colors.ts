/**
 * Design system colors for FinanceBro/dreamteam.ai
 */

export const Colors = {
  // Primary - Main actions, links, accents
  primary: "#0ea5e9", // sky-500
  primaryForeground: "#ffffff",

  // Secondary - Secondary buttons, backgrounds
  secondary: "#f1f5f9", // slate-100
  secondaryForeground: "#0f172a", // slate-900

  // Destructive - Delete actions, errors
  destructive: "#ef4444", // red-500
  destructiveForeground: "#ffffff",

  // Success
  success: "#22c55e", // green-500
  successForeground: "#ffffff",

  // Warning
  warning: "#f59e0b", // amber-500
  warningForeground: "#ffffff",

  // Backgrounds
  background: "#ffffff",
  foreground: "#0f172a", // slate-900

  // Muted - Secondary text
  muted: "#f1f5f9", // slate-100
  mutedForeground: "#64748b", // slate-500

  // Border
  border: "#e2e8f0", // slate-200

  // Card
  card: "#ffffff",
  cardForeground: "#0f172a",

  // Tab bar specific
  tabIconDefault: "#64748b", // slate-500
  tabIconSelected: "#0ea5e9", // primary
} as const;

// Light/Dark theme variants for compatibility with existing code
export default {
  light: {
    text: Colors.foreground,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.tabIconDefault,
    tabIconSelected: Colors.tabIconSelected,
  },
  dark: {
    text: "#ffffff",
    background: "#0f172a",
    tint: Colors.primary,
    tabIconDefault: "#94a3b8", // slate-400
    tabIconSelected: Colors.primary,
  },
};
