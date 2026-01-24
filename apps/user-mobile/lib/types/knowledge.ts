// Knowledge Module Types

// ============================================================================
// Core Interfaces
// ============================================================================

export interface KnowledgePage {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover_image: string | null;
  content: BlockNoteContent;
  is_template: boolean;
  template_id: string | null;
  is_archived: boolean;
  is_favorited_by: string[];
  position: number;
  created_by: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
  categories: KnowledgeCategory[];
  // Computed field for current user
  isFavorite?: boolean;
}

export interface KnowledgeCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  page_count?: number;
}

export interface KnowledgeTemplate {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  category: TemplateCategory | null;
  content: BlockNoteContent;
  is_system: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TemplateCategory =
  | "sop"
  | "onboarding"
  | "process"
  | "meeting"
  | "general";

// ============================================================================
// BlockNote Content Types
// ============================================================================

export type BlockNoteContent = Block[];

export interface Block {
  id?: string;
  type: BlockType;
  content: InlineContent[];
  props?: BlockProps;
  children?: Block[];
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "codeBlock"
  | "table"
  | "image"
  | "video"
  | "audio"
  | "file";

export interface BlockProps {
  level?: 1 | 2 | 3;
  checked?: boolean;
  language?: string;
  textColor?: string;
  backgroundColor?: string;
  textAlignment?: "left" | "center" | "right";
}

export interface InlineContent {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: InlineStyles;
}

export interface InlineStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

// ============================================================================
// API Input Types
// ============================================================================

export interface CreatePageInput {
  title: string;
  template_id?: string;
  parent_id?: string;
  icon?: string;
  content?: BlockNoteContent;
}

export interface UpdatePageInput {
  title?: string;
  content?: BlockNoteContent;
  icon?: string;
  cover_image?: string;
  parent_id?: string;
  position?: number;
  is_archived?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface PagesQueryParams {
  category_id?: string;
  parent_id?: string;
  archived?: boolean;
  favorites_only?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PagesResponse {
  pages: KnowledgePage[];
}

export interface CategoriesResponse {
  categories: KnowledgeCategory[];
}

export interface ToggleFavoriteResponse {
  isFavorite: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const SYSTEM_CATEGORIES = [
  { name: "SOPs", color: "#3b82f6", icon: "clipboard-list" },
  { name: "Meeting Notes", color: "#8b5cf6", icon: "calendar" },
  { name: "Onboarding", color: "#10b981", icon: "user-plus" },
  { name: "Processes", color: "#f59e0b", icon: "git-branch" },
  { name: "General", color: "#6b7280", icon: "file-text" },
] as const;

export const DEFAULT_PAGE_CONTENT: BlockNoteContent = [
  {
    type: "paragraph",
    content: [],
  },
];
