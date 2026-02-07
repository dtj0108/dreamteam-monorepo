import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsGettingStartedPage() {
  return (
    <article>
      <ArticleHeader
        title="Getting Started with Agents"
        description="Hire and deploy AI agents in your workspace to automate tasks, answer questions, and handle recurring work across your organization."
        readTime="7 min read"
      />

      <ArticleSection title="Welcome to Agents">
        <p>
          DreamTeam agents are AI-powered team members that live inside your workspace.
          Each agent specializes in a different area — from sales outreach and financial
          analysis to customer support and content creation. You hire agents from the
          Discover marketplace, chat with them directly, and set up schedules so they
          can work autonomously on your behalf.
        </p>
        <p>
          Agents use the context you provide about your business to deliver relevant,
          actionable results. You stay in control through approval workflows, activity
          feeds, and configurable autonomy settings.
        </p>
      </ArticleSection>

      <ArticleSection title="Agent Tiers">
        <p>
          Agents are available through three subscription tiers. Each tier determines
          how many agents you can hire simultaneously in your workspace.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Startup</strong> — $3,000/month for up to 7 agents. Ideal for small
            teams getting started with AI automation.
          </li>
          <li>
            <strong>Teams</strong> — $5,000/month for up to 18 agents. Built for
            growing organizations that need broader coverage.
          </li>
          <li>
            <strong>Enterprise</strong> — $10,000/month for up to 38 agents. Full
            capacity for large-scale operations with maximum automation.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Your First Steps">
        <StepList
          steps={[
            {
              title: "Navigate to Agents",
              description:
                "Click the Agents section in the left sidebar to access the agent platform.",
            },
            {
              title: "Choose your tier plan",
              description:
                "Select the Startup, Teams, or Enterprise tier based on how many agents you need.",
            },
            {
              title: "Browse the Discover marketplace",
              description:
                "Explore the full catalog of available agents, each with a description of their capabilities.",
            },
            {
              title: "Hire your first agent",
              description:
                "Click Hire on an agent card to add them to your workspace. They will appear in your sidebar immediately.",
            },
            {
              title: "Start a conversation",
              description:
                "Click the agent in your sidebar to open a chat. Type a message and send it to see the agent in action.",
            },
            {
              title: "Set up autonomy context",
              description:
                "Visit the Autonomy page to provide business context that helps your agents make better decisions.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Start with Startup">
        If you&apos;re new to AI agents, the Startup tier is a great way to explore
        the platform. You can upgrade to Teams or Enterprise at any time as your
        needs grow.
      </Callout>

      <ArticleSection title="Key Concepts">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Agents</strong> — AI team members that perform specific tasks in
            your workspace.
          </li>
          <li>
            <strong>Tiers</strong> — Subscription plans that determine the number of
            agents you can hire.
          </li>
          <li>
            <strong>Discover</strong> — The marketplace where you browse and hire agents.
          </li>
          <li>
            <strong>Chat</strong> — The conversational interface for interacting with
            your agents directly.
          </li>
          <li>
            <strong>Schedules</strong> — Recurring CRON-based tasks you assign to agents.
          </li>
          <li>
            <strong>Autonomy</strong> — Business context that guides agent decision-making.
          </li>
          <li>
            <strong>Approvals</strong> — A review step for agent actions that require
            human sign-off before execution.
          </li>
          <li>
            <strong>Activity</strong> — A feed of all agent executions, including results,
            tool usage, and costs.
          </li>
        </ul>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Discovering & Hiring Agents",
            href: "/learn/agents/discover",
            description: "Browse the marketplace and hire agents for your workspace.",
          },
          {
            title: "Agent Chat",
            href: "/learn/agents/chat",
            description: "Learn how to interact with agents through the chat interface.",
          },
          {
            title: "Configuring Agents",
            href: "/learn/agents/configure",
            description: "Customize agent style, instructions, and notifications.",
          },
        ]}
      />
    </article>
  )
}
