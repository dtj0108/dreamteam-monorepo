// Permission Keys
export type PermissionKey =
  // Member Management
  | "can_invite"
  | "can_remove_members"
  | "can_change_roles"
  | "can_manage_product_access"
  // Workspace Settings
  | "can_edit_workspace"
  | "can_manage_integrations"
  | "can_manage_billing"
  // Content & Data
  | "can_delete_content"
  | "can_export_data"
  | "can_import_data"
  // Finance
  | "can_view_transactions"
  | "can_create_transactions"
  | "can_edit_transactions"
  | "can_delete_transactions"
  | "can_manage_budgets"
  | "can_manage_accounts"
  // CRM/Sales
  | "can_view_leads"
  | "can_create_leads"
  | "can_edit_leads"
  | "can_delete_leads"
  | "can_assign_leads"
  | "can_manage_deals"
  // Content/Messaging
  | "can_create_channels"
  | "can_delete_channels"
  | "can_pin_messages"
  | "can_delete_messages"
  | "can_manage_documents"
  // Analytics
  | "can_view_analytics"
  | "can_create_reports"
  | "can_view_all_data"
  // Projects
  | "can_view_projects"
  | "can_create_projects"
  | "can_edit_projects"
  | "can_delete_projects"
  | "can_manage_tasks"
  | "can_assign_tasks"
  // Knowledge
  | "can_view_knowledge"
  | "can_create_pages"
  | "can_edit_pages"
  | "can_delete_pages"
  | "can_manage_categories"
  // Agents
  | "can_view_agents"
  | "can_create_agents"
  | "can_edit_agents"
  | "can_delete_agents"
  | "can_run_agents"

// Feature Flag Keys
export type FeatureFlagKey =
  | "ai_capabilities"
  | "beta_features"
  | "advanced_analytics"
  | "api_access"
  | "webhook_integrations"

// Product IDs
export type ProductId = "finance" | "sales" | "team" | "projects" | "knowledge" | "agents"

// Workspace Role
export type WorkspaceRole = "owner" | "admin" | "member"

// Workspace Permission record (role-based defaults)
export interface WorkspacePermission {
  id: string
  workspace_id: string
  role: "admin" | "member"
  permission_key: PermissionKey
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Member Permission Override record (per-user overrides)
export interface MemberPermissionOverride {
  id: string
  workspace_id: string
  member_id: string
  permission_key: PermissionKey
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Merged member permission (with override info)
export interface MemberPermission {
  permission_key: PermissionKey
  is_enabled: boolean
  is_override: boolean
  role_default: boolean
}

// Response from GET /api/team/members/[id]/permissions
export interface MemberPermissionsResponse {
  member_id: string
  role: "admin" | "member"
  permissions: MemberPermission[]
}

// Workspace Feature Flag record
export interface WorkspaceFeatureFlag {
  id: string
  workspace_id: string
  feature_key: FeatureFlagKey
  is_enabled: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Workspace settings
export interface WorkspaceSettings {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  created_at: string
}

// Permission category for UI grouping
export interface PermissionCategory {
  name: string
  description: string
  permissions: PermissionConfig[]
}

// Permission configuration for UI
export interface PermissionConfig {
  key: PermissionKey
  label: string
  description: string
}

// Feature flag configuration for UI
export interface FeatureFlagConfig {
  key: FeatureFlagKey
  label: string
  description: string
  icon: string // Lucide icon name
  requiresPlan?: "pro" | "enterprise"
}

// All permission categories with their permissions
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Member Management",
    description: "Control who can manage team members",
    permissions: [
      {
        key: "can_invite",
        label: "Invite members",
        description: "Can send invitations to new team members",
      },
      {
        key: "can_remove_members",
        label: "Remove members",
        description: "Can remove members from the workspace",
      },
      {
        key: "can_change_roles",
        label: "Change roles",
        description: "Can change member roles (admin/member)",
      },
      {
        key: "can_manage_product_access",
        label: "Manage product access",
        description: "Can control which products members can access",
      },
    ],
  },
  {
    name: "Finance",
    description: "Control access to financial features",
    permissions: [
      {
        key: "can_view_transactions",
        label: "View transactions",
        description: "Can view transaction history",
      },
      {
        key: "can_create_transactions",
        label: "Create transactions",
        description: "Can create new transactions",
      },
      {
        key: "can_edit_transactions",
        label: "Edit transactions",
        description: "Can modify existing transactions",
      },
      {
        key: "can_delete_transactions",
        label: "Delete transactions",
        description: "Can delete transactions",
      },
      {
        key: "can_manage_budgets",
        label: "Manage budgets",
        description: "Can create, edit, and delete budgets",
      },
      {
        key: "can_manage_accounts",
        label: "Manage accounts",
        description: "Can link and unlink bank accounts",
      },
    ],
  },
  {
    name: "CRM & Sales",
    description: "Control access to CRM and sales features",
    permissions: [
      {
        key: "can_view_leads",
        label: "View leads",
        description: "Can view leads and contacts",
      },
      {
        key: "can_create_leads",
        label: "Create leads",
        description: "Can create new leads and contacts",
      },
      {
        key: "can_edit_leads",
        label: "Edit leads",
        description: "Can edit lead information",
      },
      {
        key: "can_delete_leads",
        label: "Delete leads",
        description: "Can delete leads and contacts",
      },
      {
        key: "can_assign_leads",
        label: "Assign leads",
        description: "Can assign leads to team members",
      },
      {
        key: "can_manage_deals",
        label: "Manage deals",
        description: "Can create, edit, and manage deal pipelines",
      },
    ],
  },
  {
    name: "Messaging & Content",
    description: "Control messaging and content features",
    permissions: [
      {
        key: "can_create_channels",
        label: "Create channels",
        description: "Can create new channels",
      },
      {
        key: "can_delete_channels",
        label: "Delete channels",
        description: "Can delete channels",
      },
      {
        key: "can_pin_messages",
        label: "Pin messages",
        description: "Can pin messages in channels",
      },
      {
        key: "can_delete_messages",
        label: "Delete messages",
        description: "Can delete any message (not just their own)",
      },
      {
        key: "can_manage_documents",
        label: "Manage documents",
        description: "Can upload and delete shared documents",
      },
    ],
  },
  {
    name: "Analytics & Reports",
    description: "Control access to analytics and reporting",
    permissions: [
      {
        key: "can_view_analytics",
        label: "View analytics",
        description: "Can access analytics dashboards",
      },
      {
        key: "can_create_reports",
        label: "Create reports",
        description: "Can create custom reports",
      },
      {
        key: "can_view_all_data",
        label: "View all data",
        description: "Can view all workspace data (vs only assigned/own)",
      },
    ],
  },
  {
    name: "Content & Data",
    description: "Control content and data operations",
    permissions: [
      {
        key: "can_delete_content",
        label: "Delete content",
        description: "Can delete workspace content (leads, documents, etc.)",
      },
      {
        key: "can_export_data",
        label: "Export data",
        description: "Can export workspace data",
      },
      {
        key: "can_import_data",
        label: "Import data",
        description: "Can import data into the workspace",
      },
    ],
  },
  {
    name: "Workspace Settings",
    description: "Control workspace configuration",
    permissions: [
      {
        key: "can_edit_workspace",
        label: "Edit workspace",
        description: "Can change workspace name, description, and avatar",
      },
      {
        key: "can_manage_integrations",
        label: "Manage integrations",
        description: "Can configure third-party integrations",
      },
      {
        key: "can_manage_billing",
        label: "Manage billing",
        description: "Can manage payment methods, subscriptions, and auto-replenish settings",
      },
    ],
  },
  {
    name: "Projects",
    description: "Control access to project management features",
    permissions: [
      {
        key: "can_view_projects",
        label: "View projects",
        description: "Can view projects and their details",
      },
      {
        key: "can_create_projects",
        label: "Create projects",
        description: "Can create new projects",
      },
      {
        key: "can_edit_projects",
        label: "Edit projects",
        description: "Can modify project details and settings",
      },
      {
        key: "can_delete_projects",
        label: "Delete projects",
        description: "Can delete projects",
      },
      {
        key: "can_manage_tasks",
        label: "Manage tasks",
        description: "Can create, edit, and delete tasks",
      },
      {
        key: "can_assign_tasks",
        label: "Assign tasks",
        description: "Can assign tasks to team members",
      },
    ],
  },
  {
    name: "Knowledge Base",
    description: "Control access to knowledge and documentation",
    permissions: [
      {
        key: "can_view_knowledge",
        label: "View knowledge",
        description: "Can view knowledge base pages",
      },
      {
        key: "can_create_pages",
        label: "Create pages",
        description: "Can create new knowledge pages",
      },
      {
        key: "can_edit_pages",
        label: "Edit pages",
        description: "Can edit existing pages",
      },
      {
        key: "can_delete_pages",
        label: "Delete pages",
        description: "Can delete knowledge pages",
      },
      {
        key: "can_manage_categories",
        label: "Manage categories",
        description: "Can create, edit, and delete categories",
      },
    ],
  },
  {
    name: "AI Agents",
    description: "Control access to AI agent features",
    permissions: [
      {
        key: "can_view_agents",
        label: "View agents",
        description: "Can view available AI agents",
      },
      {
        key: "can_create_agents",
        label: "Create agents",
        description: "Can create new AI agents",
      },
      {
        key: "can_edit_agents",
        label: "Edit agents",
        description: "Can modify agent configurations",
      },
      {
        key: "can_delete_agents",
        label: "Delete agents",
        description: "Can delete AI agents",
      },
      {
        key: "can_run_agents",
        label: "Run agents",
        description: "Can execute AI agents",
      },
    ],
  },
]

// All feature flags with their configuration
export const FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: "ai_capabilities",
    label: "AI Capabilities",
    description: "Enable AI-powered features like smart suggestions and automation",
    icon: "Sparkles",
  },
  {
    key: "beta_features",
    label: "Beta Features",
    description: "Access experimental features before they're released",
    icon: "FlaskConical",
  },
  {
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Unlock advanced reporting and analytics dashboards",
    icon: "BarChart3",
    requiresPlan: "pro",
  },
  {
    key: "api_access",
    label: "API Access",
    description: "Enable programmatic access via REST API",
    icon: "Code",
    requiresPlan: "pro",
  },
  {
    key: "webhook_integrations",
    label: "Webhook Integrations",
    description: "Connect with external services via webhooks",
    icon: "Link",
  },
]

// Product configuration for UI
export const PRODUCTS: { id: ProductId; label: string; icon: string }[] = [
  { id: "finance", label: "Finance", icon: "DollarSign" },
  { id: "sales", label: "Sales", icon: "Briefcase" },
  { id: "team", label: "Team", icon: "MessageSquare" },
  { id: "projects", label: "Projects", icon: "FolderKanban" },
  { id: "knowledge", label: "Knowledge", icon: "BookOpen" },
  { id: "agents", label: "Agents", icon: "Bot" },
]

// Workspace API Key record
export interface WorkspaceApiKey {
  id: string
  workspace_id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: boolean
  revoked_at: string | null
  created_by: { id: string; name: string } | null
  revoked_by: { id: string; name: string } | null
}

// Create API Key input
export interface CreateApiKeyInput {
  workspaceId: string
  name: string
  expiresAt?: string
}

// Create API Key response (includes the full key - only shown once)
export interface CreateApiKeyResponse {
  id: string
  name: string
  key_prefix: string
  key: string // Full key - only returned once at creation
  created_at: string
  expires_at: string | null
}
