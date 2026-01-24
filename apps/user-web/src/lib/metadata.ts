import type { Metadata } from "next";

const BASE_URL = "https://dreamteam.ai";
const SITE_NAME = "dreamteam.ai";
const DEFAULT_DESCRIPTION =
  "Finance, CRM, and Team collaboration—all powered by AI. Build, sell, and scale with the tools modern businesses need.";

export type MetadataType = "marketing" | "demo" | "product";

interface CreateMetadataOptions {
  title: string;
  description?: string;
  path: string;
  type?: MetadataType;
  noIndex?: boolean;
}

/**
 * Creates consistent metadata for pages including OG and Twitter cards
 */
export function createMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  type = "marketing",
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const url = `${BASE_URL}${path}`;
  const fullTitle = path === "/" ? `${SITE_NAME} - Deploy up to 38 autonomous AI agents in minutes` : `${title} | ${SITE_NAME}`;

  // Build OG image URL with params
  const ogImageParams = new URLSearchParams({
    title,
    description: description.slice(0, 100),
    type,
  });
  const ogImageUrl = `${BASE_URL}/api/og?${ogImageParams.toString()}`;

  return {
    title: fullTitle,
    description,
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Metadata for marketing pages
 */
export const marketingMetadata = {
  home: createMetadata({
    title: "dreamteam.ai",
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  about: createMetadata({
    title: "About",
    description: "Learn about dreamteam.ai and our mission to transform how businesses operate in the AI era.",
    path: "/about",
  }),
  pricing: createMetadata({
    title: "Pricing",
    description: "Simple, transparent pricing for teams of all sizes. Start free, scale as you grow.",
    path: "/pricing",
  }),
};

/**
 * Metadata for product pages
 */
export const productMetadata = {
  finance: createMetadata({
    title: "Finance",
    description: "AI-powered finance management. Track expenses, manage budgets, and get intelligent insights.",
    path: "/products/finance",
    type: "product",
  }),
  crm: createMetadata({
    title: "CRM",
    description: "Smart sales CRM that helps you close more deals. AI-powered lead scoring and pipeline management.",
    path: "/products/crm",
    type: "product",
  }),
  team: createMetadata({
    title: "Team",
    description: "Team collaboration reimagined. Messaging, calls, and coordination with AI assistance.",
    path: "/products/team",
    type: "product",
  }),
  projects: createMetadata({
    title: "Projects",
    description: "Project management with AI. Track tasks, milestones, and team workload effortlessly.",
    path: "/products/projects",
    type: "product",
  }),
  knowledge: createMetadata({
    title: "Knowledge",
    description: "Your team's knowledge base. Documents, whiteboards, and AI-powered search.",
    path: "/products/knowledge",
    type: "product",
  }),
};

/**
 * Metadata for demo pages (noindex by default)
 */
export const demoMetadata = {
  main: createMetadata({
    title: "Demo",
    description: "Explore dreamteam.ai with sample data. Try all features without signing up.",
    path: "/demo",
    type: "demo",
    noIndex: true,
  }),
};
