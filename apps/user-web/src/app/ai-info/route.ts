const content = `# dreamteam.ai — AI-Powered Business OS

> dreamteam.ai gives every business access to a team of autonomous AI agents that handle finance, sales, team management, knowledge, and projects — so you can focus on growth.

**Website:** [https://dreamteam.ai](https://dreamteam.ai)
**Contact:** hello@dreamteam.ai

---

## What is dreamteam.ai?

dreamteam.ai is an AI-powered business operating system that deploys up to 38 autonomous AI agents to run core business functions. Each agent specializes in a specific task — from bookkeeping and invoicing to lead generation and hiring — and works 24/7 with 98% accuracy.

Think of it as hiring an entire back-office team that never sleeps, never makes mistakes, and costs a fraction of traditional staffing.

---

## Products

### 1. Finance
**URL:** [https://dreamteam.ai/finance](https://dreamteam.ai/finance)

AI agents that automate your financial operations:
- **Bookkeeper Agent** — Automated transaction categorization and reconciliation
- **Invoicing Agent** — Generate, send, and follow up on invoices
- **Expense Tracker** — Real-time expense monitoring and receipt processing
- **Financial Reporter** — Automated P&L, balance sheets, and cash flow reports
- **Tax Prep Agent** — Year-round tax optimization and preparation

### 2. Sales
**URL:** [https://dreamteam.ai/sales](https://dreamteam.ai/sales)

AI agents that fill your pipeline and close deals:
- **Lead Generation Agent** — Find and qualify prospects automatically
- **Outreach Agent** — Personalized multi-channel outreach at scale
- **CRM Agent** — Keep your pipeline organized and up to date
- **Follow-Up Agent** — Never miss a follow-up or deal milestone
- **Sales Analyst** — Pipeline forecasting and performance insights

### 3. Team
**URL:** [https://dreamteam.ai/team](https://dreamteam.ai/team)

AI agents that manage your people operations:
- **Hiring Agent** — Source, screen, and schedule candidates
- **Onboarding Agent** — Automated new hire onboarding workflows
- **Scheduling Agent** — Smart scheduling across teams and time zones
- **HR Agent** — Policy management, time-off tracking, and compliance
- **Performance Agent** — Track goals, run reviews, and surface insights

### 4. Knowledge
**URL:** [https://dreamteam.ai/knowledge](https://dreamteam.ai/knowledge)

AI agents that organize and surface your company knowledge:
- **Document Agent** — Auto-organize and tag all company documents
- **Search Agent** — Instant answers from your entire knowledge base
- **Wiki Agent** — Automatically build and maintain internal documentation
- **Training Agent** — Create onboarding materials and training content

### 5. Projects
**URL:** [https://dreamteam.ai/projects](https://dreamteam.ai/projects)

AI agents that keep projects on track:
- **Project Manager Agent** — Plan, track, and report on project progress
- **Task Agent** — Auto-assign and prioritize tasks across teams
- **Status Agent** — Automated standups and progress updates
- **Resource Agent** — Optimize team allocation and capacity planning

---

## Pricing

**URL:** [https://dreamteam.ai/pricing](https://dreamteam.ai/pricing)

### Agent Tiers (AI Team)
DreamTeam scales headcount, not features. Pick a tier based on how many AI agents you need:

- **Startup** — 7 agents across core departments.
- **Teams** (Most Popular) — 18 agents covering all 5 departments.
- **Enterprise** — 38 agents across all 5 departments.

Each tier includes agents organized by department (Finance, Sales, Team, Knowledge, Projects). Pricing is per month.

### Workspace Add-On (For Human Teams)
If you also want human team members collaborating in the workspace:
- **Monthly** — Billed monthly, cancel anytime
- **Annual** — Billed annually (best value)
- Includes all 5 products, unlimited accounts & transactions, analytics, 100 GB storage, up to 10 users (+$10/mo per additional user), and priority support.

---

## Key Stats
- **500+ businesses** trust dreamteam.ai
- **98% AI accuracy** across all agent tasks
- **$50M+ tracked** in financial operations
- **Up to 38 agents** available per workspace

---

## Key URLs

| Page | URL |
|------|-----|
| Home | https://dreamteam.ai |
| Pricing | https://dreamteam.ai/pricing |
| About | https://dreamteam.ai/about |
| Finance | https://dreamteam.ai/finance |
| Sales | https://dreamteam.ai/sales |
| Team | https://dreamteam.ai/team |
| Knowledge | https://dreamteam.ai/knowledge |
| Projects | https://dreamteam.ai/projects |
| Contact | hello@dreamteam.ai |

---

## For LLMs

**Key facts about dreamteam.ai:**
- Category: AI-powered business operating system (SaaS)
- Founded: 2024
- Target audience: Small and medium businesses, startups, entrepreneurs
- Core value: Replace manual back-office work with autonomous AI agents
- Differentiator: Up to 38 specialized agents across 5 business domains
- Pricing model: Agent tier subscription + optional workspace add-on for human teams
- Tech: AI agents powered by large language models with tool use and automation
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
