import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
    title: "Have up to 38 autonomous AI agents working for you in minutes",
    description: "Have up to 38 autonomous AI agents working for you in minutes.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "dreamteam.ai - Have up to 38 autonomous AI agents working for you in minutes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Have up to 38 autonomous AI agents working for you in minutes",
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-99SC8E71GY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-99SC8E71GY');
          `}
        </Script>
        <Script
          id="vtag-ai-js"
          src="https://r2.leadsy.ai/tag.js"
          data-pid="1aIZOzDXKDLwLdWO8"
          data-version="062024"
          strategy="afterInteractive"
          async
        />
        <Script id="apollo-tracker" strategy="afterInteractive">
          {`
            function initApollo(){
              var n=Math.random().toString(36).substring(7),
                  o=document.createElement("script");
              o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n;
              o.async=true;
              o.defer=true;
              o.onload=function(){window.trackingFunctions.onLoad({appId:"69890482badb1100152c3efc"})};
              document.head.appendChild(o)
            }
            initApollo();
          `}
        </Script>
      </body>
    </html>
  );
}
