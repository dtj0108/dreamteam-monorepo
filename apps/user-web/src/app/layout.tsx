import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RouteProvider, ThemeProvider, UserProvider, WorkspaceProvider, CallProvider } from "@/providers";
import { KeyboardShortcutsProvider } from "@/providers/keyboard-shortcuts-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CallOverlay } from "@/components/calls";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreamteam.ai"),
  title: {
    default: "dreamteam.ai - Business in the AI era",
    template: "%s | dreamteam.ai",
  },
  description: "Have up to 38 autonomous AI agents working for you in minutes.",
  openGraph: {
    type: "website",
    siteName: "dreamteam.ai",
    locale: "en_US",
    title: "Do you work with humans, AI, or both?",
    description: "Have up to 38 autonomous AI agents working for you in minutes.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "dreamteam.ai - Do you work with humans, AI, or both?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Do you work with humans, AI, or both?",
    description: "Have up to 38 autonomous AI agents working for you in minutes.",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
    colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth h-full`} suppressHydrationWarning>
      <body className="bg-background antialiased h-full">
        <RouteProvider>
          <ThemeProvider>
            <TooltipProvider>
              <KeyboardShortcutsProvider>
                <UserProvider>
                  <WorkspaceProvider>
                    <CallProvider>
                      {children}
                      <CallOverlay />
                      <Toaster richColors position="bottom-right" />
                    </CallProvider>
                  </WorkspaceProvider>
                </UserProvider>
              </KeyboardShortcutsProvider>
            </TooltipProvider>
          </ThemeProvider>
        </RouteProvider>
      </body>
    </html>
  );
}
