export type LearnProductId = "finance" | "sales" | "team" | "projects" | "knowledge" | "agents"
export type LearnHomeTarget = LearnProductId | "learn"

export interface LearnTopic {
  title: string
  href: string
  description: string
}

export interface LearnProductSection {
  id: LearnProductId
  title: string
  description: string
  emoji: string
  baseHref: string
  topics: LearnTopic[]
}

export const learnSections: LearnProductSection[] = [
  {
    id: "finance",
    title: "Finance",
    description: "Accounts, transactions, budgets, and reporting.",
    emoji: "💰",
    baseHref: "/learn",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/getting-started",
        description: "Set up your finance workspace quickly.",
      },
      {
        title: "Managing Accounts",
        href: "/learn/accounts",
        description: "Connect and manage your accounts.",
      },
      {
        title: "Transactions",
        href: "/learn/transactions",
        description: "Track and organize income and expenses.",
      },
      {
        title: "Budgets",
        href: "/learn/budgets",
        description: "Plan spending and monitor budget health.",
      },
      {
        title: "Analytics & Reports",
        href: "/learn/analytics",
        description: "Understand your business performance.",
      },
      {
        title: "Goals",
        href: "/learn/goals",
        description: "Track growth, profit, and long-term targets.",
      },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    description: "Leads, deals, outreach, and pipeline operations.",
    emoji: "🤝",
    baseHref: "/learn/sales",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/sales/getting-started",
        description: "Set up your workspace and create your first lead.",
      },
      {
        title: "Lead Management",
        href: "/learn/sales/leads",
        description: "Create, organize, and track leads with smart views.",
      },
      {
        title: "Contacts & Communication",
        href: "/learn/sales/contacts",
        description: "Manage contacts and their communication details.",
      },
      {
        title: "Opportunities & Pipeline",
        href: "/learn/sales/opportunities",
        description: "Track deals through pipeline stages to close.",
      },
      {
        title: "Inbox & Conversations",
        href: "/learn/sales/inbox",
        description: "Manage email and SMS from a unified inbox.",
      },
      {
        title: "Workflows & Automation",
        href: "/learn/sales/workflows",
        description: "Build multi-step outreach sequences.",
      },
      {
        title: "Email & SMS Templates",
        href: "/learn/sales/templates",
        description: "Create reusable templates with dynamic tags.",
      },
      {
        title: "Reports & Analytics",
        href: "/learn/sales/reports",
        description: "Analyze activity and pipeline performance.",
      },
    ],
  },
  {
    id: "team",
    title: "Team",
    description: "Channels, DMs, meetings, and coordination.",
    emoji: "💬",
    baseHref: "/learn/team",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/team/getting-started",
        description: "Browse channels, send messages, and start DMs.",
      },
      {
        title: "Channels",
        href: "/learn/team/channels",
        description: "Create and manage public and private channels.",
      },
      {
        title: "Direct Messages",
        href: "/learn/team/direct-messages",
        description: "Start private conversations with teammates.",
      },
      {
        title: "File Sharing",
        href: "/learn/team/files",
        description: "Share and browse files across conversations.",
      },
      {
        title: "Meetings & Calls",
        href: "/learn/team/meetings",
        description: "Start calls from channels and direct messages.",
      },
      {
        title: "Search & Mentions",
        href: "/learn/team/search",
        description: "Find messages and track @mentions.",
      },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    description: "Tasks, timelines, milestones, and workload.",
    emoji: "📋",
    baseHref: "/learn/projects",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/projects/getting-started",
        description: "Create and structure your first project.",
      },
      {
        title: "Kanban",
        href: "/learn/projects/kanban",
        description: "Manage work with board-based workflows.",
      },
      {
        title: "Task Management",
        href: "/learn/projects/tasks",
        description: "Track delivery with clear task ownership.",
      },
      {
        title: "Timeline",
        href: "/learn/projects/timeline",
        description: "Plan dependencies and delivery windows.",
      },
      {
        title: "Calendar",
        href: "/learn/projects/calendar",
        description: "Visualize project deadlines by date.",
      },
      {
        title: "Milestones",
        href: "/learn/projects/milestones",
        description: "Measure progress with key checkpoints.",
      },
      {
        title: "Workload",
        href: "/learn/projects/workload",
        description: "Balance assignments across teammates.",
      },
      {
        title: "Reports",
        href: "/learn/projects/reports",
        description: "Review project execution and outcomes.",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "Pages, templates, whiteboards, and SOPs.",
    emoji: "📚",
    baseHref: "/learn/knowledge",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/knowledge/getting-started",
        description: "Create your first page and organize content.",
      },
      {
        title: "Pages & Editor",
        href: "/learn/knowledge/pages",
        description: "Create and edit rich content pages.",
      },
      {
        title: "Categories & Organization",
        href: "/learn/knowledge/categories",
        description: "Organize pages with color-coded categories.",
      },
      {
        title: "Templates",
        href: "/learn/knowledge/templates",
        description: "Build reusable page templates.",
      },
      {
        title: "Whiteboards",
        href: "/learn/knowledge/whiteboards",
        description: "Collaborate visually with drawing tools.",
      },
      {
        title: "Search & Favorites",
        href: "/learn/knowledge/search",
        description: "Find pages and save favorites.",
      },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    description: "Agent setup, autonomy, approvals, and schedules.",
    emoji: "🤖",
    baseHref: "/learn/agents",
    topics: [
      {
        title: "Getting Started",
        href: "/learn/agents/getting-started",
        description: "Choose a tier, hire your first agent, and chat.",
      },
      {
        title: "Discovering & Hiring",
        href: "/learn/agents/discover",
        description: "Browse the marketplace and hire agents.",
      },
      {
        title: "Agent Chat",
        href: "/learn/agents/chat",
        description: "Interact with agents through the chat interface.",
      },
      {
        title: "Configuring Agents",
        href: "/learn/agents/configure",
        description: "Customize style, instructions, and notifications.",
      },
      {
        title: "Schedules & Automation",
        href: "/learn/agents/schedules",
        description: "Set up recurring tasks with CRON schedules.",
      },
      {
        title: "Autonomy & Business Context",
        href: "/learn/agents/autonomy",
        description: "Provide context that shapes agent behavior.",
      },
      {
        title: "Activity & Approvals",
        href: "/learn/agents/activity",
        description: "Review activity feeds and approve pending actions.",
      },
    ],
  },
]

export function getLearnHomeHref(productId: LearnHomeTarget): string {
  if (productId === "learn") {
    return "/learn"
  }

  const section = learnSections.find((entry) => entry.id === productId)
  return section?.baseHref ?? "/learn"
}

export function getLearnProductFromPath(pathname: string): LearnProductId | null {
  if (!pathname.startsWith("/learn")) {
    return null
  }

  if (pathname === "/learn" || pathname.startsWith("/learn/getting-started") || pathname.startsWith("/learn/accounts") || pathname.startsWith("/learn/transactions") || pathname.startsWith("/learn/budgets") || pathname.startsWith("/learn/analytics") || pathname.startsWith("/learn/goals")) {
    return "finance"
  }

  if (pathname.startsWith("/learn/projects")) {
    return "projects"
  }

  if (pathname.startsWith("/learn/sales")) {
    return "sales"
  }

  if (pathname.startsWith("/learn/team")) {
    return "team"
  }

  if (pathname.startsWith("/learn/knowledge")) {
    return "knowledge"
  }

  if (pathname.startsWith("/learn/agents")) {
    return "agents"
  }

  return "finance"
}
