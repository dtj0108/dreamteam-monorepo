import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsDiscoverPage() {
  return (
    <article>
      <ArticleHeader
        title="Discovering & Hiring Agents"
        description="Browse the Discover marketplace to find specialized AI agents and add them to your workspace."
        readTime="5 min read"
      />

      <ArticleSection title="What Is the Discover Marketplace?">
        <p>
          The Discover marketplace is where you find and hire AI agents for your
          workspace. Each agent is built for a specific role — such as sales
          prospecting, financial reporting, or content writing — and comes with a
          detailed description of its capabilities, tools, and ideal use cases.
        </p>
        <p>
          Think of Discover as a talent marketplace for AI. You browse the available
          agents, review what each one can do, and hire the ones that match your
          team&apos;s needs.
        </p>
      </ArticleSection>

      <ArticleSection title="Browsing Agents">
        <p>
          Navigate to the Discover page from the Agents section in your sidebar. You
          will see a grid of agent cards, each showing:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Agent name</strong> — The agent&apos;s role and identity.
          </li>
          <li>
            <strong>Description</strong> — A summary of what the agent does and when
            to use it.
          </li>
          <li>
            <strong>Capabilities</strong> — The tools and actions the agent can perform
            on your behalf.
          </li>
        </ul>
        <p>
          Scroll through the marketplace to explore the full catalog. Each card gives
          you enough context to decide whether the agent fits your workflow.
        </p>
      </ArticleSection>

      <ArticleSection title="Hiring an Agent">
        <StepList
          steps={[
            {
              title: "Browse the marketplace",
              description:
                "Open the Discover page and review the available agents.",
            },
            {
              title: "Review agent details",
              description:
                "Read the agent description and capabilities to confirm it fits your needs.",
            },
            {
              title: "Click Hire",
              description:
                "Press the Hire button on the agent card to add it to your workspace.",
            },
            {
              title: "Confirm tier capacity",
              description:
                "Make sure your current tier has room for another agent. If not, you will be prompted to upgrade.",
            },
            {
              title: "Agent appears in your sidebar",
              description:
                "Once hired, the agent shows up in your left sidebar under Agents. You can start chatting immediately.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="info" title="Tier Limits">
        Your subscription tier determines how many agents you can have active at
        once. The Startup tier supports 7 agents, Teams supports 18, and Enterprise
        supports 38. If you reach your limit, you will need to upgrade or release an
        existing agent before hiring a new one.
      </Callout>

      <ArticleSection title="Tier Limits">
        <p>
          When you reach the maximum number of agents for your tier, the Hire button
          will indicate that you have hit your capacity. You have two options: upgrade
          to a higher tier for more agent slots, or release an agent you no longer
          need to free up space.
        </p>
        <p>
          Releasing an agent removes it from your sidebar, but you can always re-hire
          it later from the Discover marketplace without losing any configuration.
        </p>
      </ArticleSection>

      <ArticleSection title="Upgrading Tiers">
        <p>
          If you outgrow your current tier, you can upgrade at any time from the
          billing settings in your account page. Upgrades take effect immediately,
          giving you access to additional agent slots right away. Downgrades take
          effect at the end of your current billing cycle.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Getting Started with Agents",
            href: "/learn/agents/getting-started",
            description: "Choose a tier, hire your first agent, and chat.",
          },
          {
            title: "Configuring Agents",
            href: "/learn/agents/configure",
            description: "Customize style, instructions, and notifications.",
          },
        ]}
      />
    </article>
  )
}
