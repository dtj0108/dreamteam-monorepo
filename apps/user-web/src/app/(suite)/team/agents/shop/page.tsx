"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles } from "lucide-react"
import { AgentCard } from "@/components/agent-shop/agent-card"
import { Button } from "@/components/ui/button"

const agents = [
  {
    emoji: "💼",
    name: "Executive Assistant",
    role: "Personal productivity expert",
    description: "Your AI chief of staff. Manages your calendar, drafts emails, and keeps you organized.",
    capabilities: [
      "Smart calendar management",
      "Email drafting & responses",
      "Task prioritization",
      "Meeting preparation",
    ],
    price: 99,
    badge: "popular" as const,
  },
  {
    emoji: "🎯",
    name: "Sales Rep",
    role: "Lead qualification specialist",
    description: "Qualifies leads 24/7, sends personalized outreach, and books meetings on your calendar.",
    capabilities: [
      "Lead scoring & qualification",
      "Personalized email outreach",
      "Follow-up sequences",
      "Meeting scheduling",
    ],
    price: 149,
  },
  {
    emoji: "💬",
    name: "Customer Success",
    role: "Support & retention specialist",
    description: "Handles support tickets, answers FAQs, and ensures customers stay happy.",
    capabilities: [
      "Ticket triage & routing",
      "FAQ auto-responses",
      "Satisfaction surveys",
      "Escalation management",
    ],
    price: 129,
  },
  {
    emoji: "✍️",
    name: "Content Writer",
    role: "Marketing content creator",
    description: "Creates blog posts, social media content, and newsletters that engage your audience.",
    capabilities: [
      "Blog post creation",
      "Social media content",
      "Email newsletters",
      "SEO optimization",
    ],
    price: 179,
    badge: "new" as const,
  },
  {
    emoji: "📊",
    name: "Data Analyst",
    role: "Business intelligence expert",
    description: "Turns your data into insights. Creates reports and dashboards automatically.",
    capabilities: [
      "Automated reporting",
      "Dashboard creation",
      "Trend analysis",
      "Forecasting",
    ],
    price: 199,
  },
  {
    emoji: "🔍",
    name: "Recruiter",
    role: "Talent acquisition specialist",
    description: "Screens resumes, schedules interviews, and helps you find the best candidates.",
    capabilities: [
      "Resume screening",
      "Candidate outreach",
      "Interview scheduling",
      "Skills assessment",
    ],
    price: 249,
  },
  {
    emoji: "📈",
    name: "Marketing Analyst",
    role: "Campaign performance expert",
    description: "Tracks campaign performance, optimizes ad spend, and improves ROI.",
    capabilities: [
      "Campaign tracking",
      "A/B test analysis",
      "ROI optimization",
      "Competitor monitoring",
    ],
    price: 189,
  },
  {
    emoji: "🛡️",
    name: "Compliance Officer",
    role: "Regulatory compliance expert",
    description: "Monitors compliance, flags risks, and keeps your business audit-ready.",
    capabilities: [
      "Policy monitoring",
      "Risk assessment",
      "Audit preparation",
      "Regulatory updates",
    ],
    price: 299,
  },
]

export default function AgentShopPage() {
  const router = useRouter()

  const handleHire = (agentName: string) => {
    // TODO: Implement hiring flow
    console.log(`Hiring ${agentName}`)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/team/agents"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Agents
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Agent Shop</h1>
          </div>
          <p className="text-muted-foreground">
            Hire AI employees to automate your business. Each agent works 24/7 and costs a fraction of a human hire.
          </p>
        </div>

        {/* Agent Grid */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              {...agent}
              onHire={() => handleHire(agent.name)}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need a custom agent for your specific needs?
          </p>
          <Button variant="outline">Request Custom Agent</Button>
        </div>
      </div>
    </div>
  )
}
