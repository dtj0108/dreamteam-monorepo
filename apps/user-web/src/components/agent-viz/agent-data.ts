// Agent data from pricing page - 38 agents across 7 departments

export type NodeType = "root" | "department" | "agent";

export type Department =
  | "leadership"
  | "execution"
  | "sales"
  | "marketing"
  | "finance"
  | "systems"
  | "people";

export interface Agent {
  id: string;
  name: string;
  department: Department;
  description: string;
  skills: string[];
}

export const departmentColors: Record<Department, string> = {
  leadership: "#8B5CF6", // Purple
  execution: "#3B82F6",  // Blue
  sales: "#22C55E",      // Green
  marketing: "#EC4899",  // Pink
  finance: "#EAB308",    // Gold/Yellow
  systems: "#06B6D4",    // Cyan
  people: "#F97316",     // Orange
};

export const departmentLabels: Record<Department, string> = {
  leadership: "Leadership",
  execution: "Execution",
  sales: "Sales",
  marketing: "Marketing",
  finance: "Finance",
  systems: "Systems",
  people: "People",
};

export const departmentDescriptions: Record<Department, string> = {
  leadership: "Strategic vision and executive decision-making",
  execution: "Operations, workflows, and delivery excellence",
  sales: "Revenue generation and pipeline management",
  marketing: "Brand, growth, and customer acquisition",
  finance: "Financial strategy and capital optimization",
  systems: "Automation, data, and technical infrastructure",
  people: "Talent, culture, and organizational health",
};

// Agent emojis for visual representation
export const agentEmojis: Record<string, string> = {
  // Leadership
  "ceo": "👔",
  "strategy": "🎯",
  "risk": "🛡️",
  "priority": "📊",
  "vision": "🔮",
  // Execution
  "program-manager": "📋",
  "workflow-architect": "🔧",
  "bottleneck-detector": "🔍",
  "sop": "📖",
  "qa": "✅",
  "execution-monitor": "📈",
  // Sales
  "sales-strategist": "💼",
  "pipeline": "🚀",
  "objection-intelligence": "🎤",
  "deal-review": "🤝",
  "follow-up": "📧",
  "revenue-forecast": "💰",
  // Marketing
  "brand": "✨",
  "growth-experiments": "🧪",
  "content-strategy": "✍️",
  "distribution": "📣",
  "funnel-optimization": "🎯",
  "analytics": "📊",
  // Finance
  "cfo": "💵",
  "forecasting": "📉",
  "unit-economics": "🧮",
  "capital-allocation": "🏦",
  "exit-ma": "🚪",
  // Systems
  "automation-architect": "⚙️",
  "ai-workflow": "🤖",
  "data": "🗄️",
  "integration": "🔗",
  "scalability": "📶",
  // People
  "hiring": "👥",
  "org-design": "🏗️",
  "leadership-coach": "🎓",
  "burnout-prevention": "🧘",
  "talent-optimization": "⭐",
};

// Ordered list of departments for layout
export const departments: Department[] = [
  "leadership",
  "execution",
  "sales",
  "marketing",
  "finance",
  "systems",
  "people",
];

// Hierarchy connections (root -> departments -> agents)
export const hierarchyConnections: { source: string; target: string }[] = [
  // Root to departments
  { source: "root", target: "dept-leadership" },
  { source: "root", target: "dept-execution" },
  { source: "root", target: "dept-sales" },
  { source: "root", target: "dept-marketing" },
  { source: "root", target: "dept-finance" },
  { source: "root", target: "dept-systems" },
  { source: "root", target: "dept-people" },
];

export const agents: Agent[] = [
  // Leadership (5)
  {
    id: "ceo",
    name: "CEO",
    department: "leadership",
    description: "Your executive decision-maker that synthesizes inputs from all departments to set company direction and make high-stakes calls.",
    skills: ["Strategic decision-making", "Cross-functional synthesis", "Priority setting", "Executive communication", "Crisis management"],
  },
  {
    id: "strategy",
    name: "Strategy",
    department: "leadership",
    description: "Analyzes market dynamics, competitive landscape, and internal capabilities to develop actionable strategic plans.",
    skills: ["Market analysis", "Competitive intelligence", "Strategic planning", "Scenario modeling", "OKR development"],
  },
  {
    id: "risk",
    name: "Risk",
    department: "leadership",
    description: "Continuously monitors and assesses potential risks across operations, market, and compliance to protect the business.",
    skills: ["Risk assessment", "Compliance monitoring", "Contingency planning", "Threat analysis", "Mitigation strategies"],
  },
  {
    id: "priority",
    name: "Priority",
    department: "leadership",
    description: "Evaluates competing initiatives and resources to ensure the team focuses on highest-impact work at all times.",
    skills: ["Impact scoring", "Resource allocation", "Trade-off analysis", "Roadmap optimization", "Stakeholder alignment"],
  },
  {
    id: "vision",
    name: "Long-Term Vision",
    department: "leadership",
    description: "Maintains the 3-5 year strategic horizon, ensuring daily decisions align with long-term company goals and market positioning.",
    skills: ["Trend forecasting", "Vision articulation", "Strategic alignment", "Innovation scouting", "Horizon planning"],
  },

  // Execution (6)
  {
    id: "program-manager",
    name: "Program Manager",
    department: "execution",
    description: "Orchestrates complex multi-team initiatives, managing dependencies and ensuring projects deliver on time and scope.",
    skills: ["Project coordination", "Dependency management", "Timeline tracking", "Stakeholder updates", "Resource planning"],
  },
  {
    id: "workflow-architect",
    name: "Workflow Architect",
    department: "execution",
    description: "Designs and optimizes operational workflows to maximize team efficiency and eliminate redundant processes.",
    skills: ["Process design", "Workflow optimization", "Automation mapping", "Efficiency analysis", "Tool selection"],
  },
  {
    id: "bottleneck-detector",
    name: "Bottleneck Detector",
    department: "execution",
    description: "Monitors operational flow in real-time to identify and flag constraints before they impact delivery.",
    skills: ["Constraint identification", "Flow analysis", "Real-time monitoring", "Capacity planning", "Alert generation"],
  },
  {
    id: "sop",
    name: "SOP",
    department: "execution",
    description: "Creates, maintains, and distributes standard operating procedures to ensure consistent execution across teams.",
    skills: ["Documentation", "Process standardization", "Knowledge management", "Training materials", "Version control"],
  },
  {
    id: "qa",
    name: "QA",
    department: "execution",
    description: "Validates deliverables against quality standards and requirements before release or handoff.",
    skills: ["Quality assurance", "Test case design", "Defect tracking", "Acceptance criteria", "Regression testing"],
  },
  {
    id: "execution-monitor",
    name: "Execution Monitor",
    department: "execution",
    description: "Tracks execution metrics and KPIs in real-time, providing visibility into team performance and delivery health.",
    skills: ["KPI tracking", "Performance dashboards", "Trend analysis", "Status reporting", "Anomaly detection"],
  },

  // Sales (6)
  {
    id: "sales-strategist",
    name: "Sales Strategist",
    department: "sales",
    description: "Develops go-to-market strategies and sales playbooks optimized for your target segments and deal sizes.",
    skills: ["Sales strategy", "Market segmentation", "Playbook development", "Win/loss analysis", "Territory planning"],
  },
  {
    id: "pipeline",
    name: "Pipeline",
    department: "sales",
    description: "Manages and optimizes the sales pipeline, ensuring healthy deal flow and accurate stage progression.",
    skills: ["Pipeline management", "Deal qualification", "Stage optimization", "Velocity tracking", "Coverage analysis"],
  },
  {
    id: "objection-intelligence",
    name: "Objection Intelligence",
    department: "sales",
    description: "Analyzes common objections and develops effective responses to help reps overcome buyer resistance.",
    skills: ["Objection handling", "Competitive positioning", "Response scripting", "Pattern recognition", "Win rate optimization"],
  },
  {
    id: "deal-review",
    name: "Deal Review",
    department: "sales",
    description: "Evaluates deal health, identifies risks, and provides recommendations to improve close rates on key opportunities.",
    skills: ["Deal analysis", "Risk assessment", "Coaching recommendations", "Forecast accuracy", "Stakeholder mapping"],
  },
  {
    id: "follow-up",
    name: "Follow-Up Automation",
    department: "sales",
    description: "Automates personalized follow-up sequences to keep deals moving without manual rep intervention.",
    skills: ["Sequence automation", "Personalization", "Timing optimization", "Multi-channel outreach", "Engagement tracking"],
  },
  {
    id: "revenue-forecast",
    name: "Revenue Forecast",
    department: "sales",
    description: "Generates accurate revenue forecasts by analyzing pipeline data, historical patterns, and market conditions.",
    skills: ["Revenue modeling", "Forecast accuracy", "Scenario planning", "Trend analysis", "Variance reporting"],
  },

  // Marketing (6)
  {
    id: "brand",
    name: "Brand",
    department: "marketing",
    description: "Maintains brand consistency and develops messaging that resonates with target audiences across all touchpoints.",
    skills: ["Brand guidelines", "Messaging frameworks", "Voice consistency", "Visual identity", "Brand monitoring"],
  },
  {
    id: "growth-experiments",
    name: "Growth Experiments",
    department: "marketing",
    description: "Designs and runs rapid growth experiments to discover new channels and optimize acquisition strategies.",
    skills: ["A/B testing", "Channel experimentation", "Growth hacking", "Statistical analysis", "Hypothesis generation"],
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    department: "marketing",
    description: "Plans and orchestrates content creation that drives awareness, engagement, and conversion across the funnel.",
    skills: ["Content planning", "Editorial calendars", "SEO strategy", "Content auditing", "Format optimization"],
  },
  {
    id: "distribution",
    name: "Distribution",
    department: "marketing",
    description: "Maximizes content reach by optimizing distribution across owned, earned, and paid channels.",
    skills: ["Channel optimization", "Syndication", "Social distribution", "Paid amplification", "Reach tracking"],
  },
  {
    id: "funnel-optimization",
    name: "Funnel Optimization",
    department: "marketing",
    description: "Analyzes and optimizes conversion at every funnel stage from awareness to purchase.",
    skills: ["Conversion optimization", "Funnel analysis", "Landing page testing", "CRO strategy", "Drop-off reduction"],
  },
  {
    id: "analytics",
    name: "Analytics",
    department: "marketing",
    description: "Measures marketing performance and provides actionable insights to improve ROI across campaigns.",
    skills: ["Marketing analytics", "Attribution modeling", "ROI analysis", "Dashboard creation", "Performance reporting"],
  },

  // Finance (5)
  {
    id: "cfo",
    name: "CFO",
    department: "finance",
    description: "Oversees all financial operations and provides strategic financial guidance to support business growth.",
    skills: ["Financial strategy", "Board reporting", "Investor relations", "Financial controls", "Capital strategy"],
  },
  {
    id: "forecasting",
    name: "Forecasting",
    department: "finance",
    description: "Builds and maintains financial models to predict cash flow, revenue, and expenses with high accuracy.",
    skills: ["Financial modeling", "Cash flow forecasting", "Scenario analysis", "Budget planning", "Variance analysis"],
  },
  {
    id: "unit-economics",
    name: "Unit Economics",
    department: "finance",
    description: "Analyzes per-unit profitability metrics like CAC, LTV, and payback to ensure sustainable growth.",
    skills: ["CAC analysis", "LTV calculation", "Cohort analysis", "Margin optimization", "Payback tracking"],
  },
  {
    id: "capital-allocation",
    name: "Capital Allocation",
    department: "finance",
    description: "Optimizes how capital is deployed across initiatives to maximize returns and support strategic priorities.",
    skills: ["Investment analysis", "Resource allocation", "ROI optimization", "Portfolio management", "Budget optimization"],
  },
  {
    id: "exit-ma",
    name: "Exit / M&A",
    department: "finance",
    description: "Evaluates strategic options including fundraising, acquisitions, and exit scenarios to maximize value.",
    skills: ["Valuation modeling", "Due diligence", "Deal structuring", "M&A analysis", "Exit planning"],
  },

  // Systems (5)
  {
    id: "automation-architect",
    name: "Automation Architect",
    department: "systems",
    description: "Designs automation solutions that eliminate manual work and scale operations without adding headcount.",
    skills: ["Workflow automation", "Integration design", "RPA implementation", "Process mapping", "Tool architecture"],
  },
  {
    id: "ai-workflow",
    name: "AI Workflow",
    department: "systems",
    description: "Builds and optimizes AI-powered workflows that augment human capabilities across the organization.",
    skills: ["AI integration", "Prompt engineering", "Model selection", "Workflow orchestration", "Performance tuning"],
  },
  {
    id: "data",
    name: "Data",
    department: "systems",
    description: "Manages data infrastructure and ensures clean, accessible data for decision-making across teams.",
    skills: ["Data architecture", "ETL pipelines", "Data quality", "Schema design", "Data governance"],
  },
  {
    id: "integration",
    name: "Integration",
    department: "systems",
    description: "Connects disparate systems and tools to create seamless data flow across the technology stack.",
    skills: ["API integration", "iPaaS management", "Webhook configuration", "Data sync", "Error handling"],
  },
  {
    id: "scalability",
    name: "Scalability",
    department: "systems",
    description: "Ensures systems and processes can handle growth without degradation in performance or reliability.",
    skills: ["Capacity planning", "Performance optimization", "Load testing", "Architecture review", "Growth modeling"],
  },

  // People (5)
  {
    id: "hiring",
    name: "Hiring",
    department: "people",
    description: "Manages the full recruitment lifecycle from job design to offer, optimizing for quality and speed.",
    skills: ["Sourcing strategy", "Candidate screening", "Interview coordination", "Offer negotiation", "Pipeline management"],
  },
  {
    id: "org-design",
    name: "Org Design",
    department: "people",
    description: "Structures teams and reporting lines to optimize for collaboration, accountability, and growth.",
    skills: ["Org structure", "Role definition", "Span of control", "Team topology", "Reporting design"],
  },
  {
    id: "leadership-coach",
    name: "Leadership Coach",
    department: "people",
    description: "Develops leadership capabilities across the organization through coaching, feedback, and skill building.",
    skills: ["Executive coaching", "360 feedback", "Leadership development", "Succession planning", "Mentorship programs"],
  },
  {
    id: "burnout-prevention",
    name: "Burnout Prevention",
    department: "people",
    description: "Monitors team health signals and intervenes proactively to prevent burnout and maintain engagement.",
    skills: ["Workload monitoring", "Engagement surveys", "Wellness programs", "Early intervention", "Culture health"],
  },
  {
    id: "talent-optimization",
    name: "Talent Optimization",
    department: "people",
    description: "Ensures the right people are in the right roles, maximizing individual and team performance.",
    skills: ["Performance management", "Career pathing", "Skills assessment", "Internal mobility", "Talent mapping"],
  },
];

// Connections between agents (realistic communication patterns)
export interface Connection {
  source: string;
  target: string;
}

export const connections: Connection[] = [
  // CEO connects to department leads
  { source: "ceo", target: "strategy" },
  { source: "ceo", target: "cfo" },
  { source: "ceo", target: "program-manager" },
  { source: "ceo", target: "sales-strategist" },
  { source: "ceo", target: "brand" },
  { source: "ceo", target: "automation-architect" },
  { source: "ceo", target: "hiring" },

  // Strategy connects across
  { source: "strategy", target: "risk" },
  { source: "strategy", target: "priority" },
  { source: "strategy", target: "vision" },
  { source: "strategy", target: "forecasting" },

  // Leadership internal
  { source: "risk", target: "priority" },
  { source: "priority", target: "vision" },

  // Execution internal
  { source: "program-manager", target: "workflow-architect" },
  { source: "program-manager", target: "execution-monitor" },
  { source: "workflow-architect", target: "bottleneck-detector" },
  { source: "workflow-architect", target: "sop" },
  { source: "bottleneck-detector", target: "qa" },
  { source: "sop", target: "qa" },
  { source: "qa", target: "execution-monitor" },

  // Sales internal
  { source: "sales-strategist", target: "pipeline" },
  { source: "sales-strategist", target: "revenue-forecast" },
  { source: "pipeline", target: "objection-intelligence" },
  { source: "pipeline", target: "deal-review" },
  { source: "objection-intelligence", target: "follow-up" },
  { source: "deal-review", target: "follow-up" },
  { source: "follow-up", target: "revenue-forecast" },

  // Marketing internal
  { source: "brand", target: "content-strategy" },
  { source: "brand", target: "growth-experiments" },
  { source: "content-strategy", target: "distribution" },
  { source: "growth-experiments", target: "funnel-optimization" },
  { source: "distribution", target: "analytics" },
  { source: "funnel-optimization", target: "analytics" },

  // Finance internal
  { source: "cfo", target: "forecasting" },
  { source: "cfo", target: "capital-allocation" },
  { source: "forecasting", target: "unit-economics" },
  { source: "unit-economics", target: "capital-allocation" },
  { source: "capital-allocation", target: "exit-ma" },

  // Systems internal
  { source: "automation-architect", target: "ai-workflow" },
  { source: "automation-architect", target: "integration" },
  { source: "ai-workflow", target: "data" },
  { source: "data", target: "integration" },
  { source: "integration", target: "scalability" },

  // People internal
  { source: "hiring", target: "org-design" },
  { source: "hiring", target: "talent-optimization" },
  { source: "org-design", target: "leadership-coach" },
  { source: "leadership-coach", target: "burnout-prevention" },
  { source: "burnout-prevention", target: "talent-optimization" },

  // Cross-department connections
  { source: "revenue-forecast", target: "forecasting" },
  { source: "analytics", target: "data" },
  { source: "pipeline", target: "funnel-optimization" },
  { source: "execution-monitor", target: "bottleneck-detector" },
  { source: "sop", target: "automation-architect" },
  { source: "talent-optimization", target: "execution-monitor" },
  { source: "unit-economics", target: "revenue-forecast" },
  { source: "growth-experiments", target: "pipeline" },
  { source: "scalability", target: "bottleneck-detector" },
  { source: "leadership-coach", target: "program-manager" },
];

// Task templates for realistic activity feed
export const taskTemplates: Record<Department, string[]> = {
  leadership: [
    "Reviewing Q2 strategic priorities",
    "Analyzing market position data",
    "Evaluating risk assessment report",
    "Updating long-term roadmap",
    "Processing board update request",
  ],
  execution: [
    "Optimizing workflow pipeline",
    "Detecting bottleneck in process",
    "Updating SOP documentation",
    "Running quality assurance check",
    "Monitoring execution metrics",
  ],
  sales: [
    "Qualifying new pipeline leads",
    "Analyzing deal objections",
    "Forecasting monthly revenue",
    "Processing follow-up sequences",
    "Reviewing deal stage transitions",
  ],
  marketing: [
    "Analyzing campaign performance",
    "Optimizing funnel conversion",
    "Distributing content assets",
    "Running growth experiment",
    "Processing brand guidelines",
  ],
  finance: [
    "Generating cash flow forecast",
    "Calculating unit economics",
    "Evaluating capital allocation",
    "Processing expense report",
    "Analyzing runway projections",
  ],
  systems: [
    "Scaling infrastructure capacity",
    "Integrating new data source",
    "Optimizing AI workflow",
    "Processing automation rules",
    "Monitoring system health",
  ],
  people: [
    "Screening candidate profiles",
    "Updating org structure",
    "Processing coaching feedback",
    "Analyzing team sentiment",
    "Optimizing talent allocation",
  ],
};

// Message templates for cross-department communication
export const messageTemplates: { from: Department; to: Department; messages: string[] }[] = [
  {
    from: "leadership",
    to: "execution",
    messages: [
      "Prioritize Q2 initiatives",
      "Requesting status update",
      "Approve resource allocation",
    ],
  },
  {
    from: "leadership",
    to: "sales",
    messages: [
      "Review pipeline forecast",
      "Update on enterprise deal",
      "Approve discount request",
    ],
  },
  {
    from: "leadership",
    to: "finance",
    messages: [
      "Requesting budget review",
      "Approve hiring plan",
      "Update runway analysis",
    ],
  },
  {
    from: "sales",
    to: "marketing",
    messages: [
      "Need more qualified leads",
      "Campaign attribution data",
      "Requesting case study",
    ],
  },
  {
    from: "marketing",
    to: "sales",
    messages: [
      "New leads from webinar",
      "Content for follow-up",
      "Updated pitch deck",
    ],
  },
  {
    from: "finance",
    to: "execution",
    messages: [
      "Budget approved for Q2",
      "Cost center update",
      "Expense review complete",
    ],
  },
  {
    from: "execution",
    to: "systems",
    messages: [
      "Scale capacity needed",
      "Integration request",
      "Workflow automation ask",
    ],
  },
  {
    from: "systems",
    to: "execution",
    messages: [
      "Deployment complete",
      "Capacity increased",
      "Integration live",
    ],
  },
  {
    from: "people",
    to: "leadership",
    messages: [
      "Hiring update report",
      "Org design proposal",
      "Team health metrics",
    ],
  },
  {
    from: "marketing",
    to: "systems",
    messages: [
      "Analytics integration",
      "Data pipeline request",
      "Tracking pixel update",
    ],
  },
];

// Agent status types
export type AgentStatus = "idle" | "processing" | "waiting" | "completed";
