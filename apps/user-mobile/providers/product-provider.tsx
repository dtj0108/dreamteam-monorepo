import { usePathname } from "expo-router";

export type ProductId = "hub" | "finance" | "sales" | "team" | "projects" | "knowledge" | "agents";

export interface Product {
  id: ProductId;
  name: string;
  emoji: string;
  route: string;
  description: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "hub",
    name: "Hub",
    emoji: "🏠",
    route: "/(main)/hub",
    description: "Home dashboard",
  },
  {
    id: "finance",
    name: "Finance",
    emoji: "💰",
    route: "/(main)/finance",
    description: "Financial management",
  },
  {
    id: "sales",
    name: "Sales",
    emoji: "🤝",
    route: "/(main)/sales",
    description: "CRM and pipeline",
  },
  {
    id: "team",
    name: "Team",
    emoji: "💬",
    route: "/(main)/team",
    description: "Team messaging",
  },
  {
    id: "projects",
    name: "Projects",
    emoji: "📋",
    route: "/(main)/projects",
    description: "Project management",
  },
  {
    id: "knowledge",
    name: "Knowledge",
    emoji: "📖",
    route: "/(main)/more/knowledge",
    description: "Documentation wiki",
  },
  {
    id: "agents",
    name: "Agents",
    emoji: "✨",
    route: "/(main)/agents",
    description: "AI employees",
  },
];

export function useCurrentProduct(): Product | null {
  const pathname = usePathname();

  // Return null when on hub - no product switcher needed
  if (pathname.startsWith("/hub")) return null;
  if (pathname.startsWith("/sales")) return PRODUCTS[2];
  if (pathname.startsWith("/team")) return PRODUCTS[3];
  if (pathname.startsWith("/projects")) return PRODUCTS[4];
  if (pathname.startsWith("/more/knowledge") || pathname.startsWith("/knowledge"))
    return PRODUCTS[5];
  if (pathname.startsWith("/agents"))
    return PRODUCTS[6];

  return PRODUCTS[1]; // default to finance
}
