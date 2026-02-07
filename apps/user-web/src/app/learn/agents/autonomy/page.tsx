import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsAutonomyPage() {
  return (
    <article>
      <ArticleHeader
        title="Autonomy & Business Context"
        description="Provide your agents with structured business context so they can make better decisions and produce more relevant output."
        readTime="6 min read"
      />

      <ArticleSection title="What Is Autonomy Context?">
        <p>
          Autonomy context is the business information you share with your agents
          to help them understand your organization. When agents have context about
          your company, industry, customers, and goals, they produce output that
          is more accurate and actionable.
        </p>
        <p>
          You provide this context through the Autonomy page, which is accessible
          from the Agents section in your sidebar. The context you enter here is
          shared across all agents in your workspace.
        </p>
      </ArticleSection>

      <ArticleSection title="Guided Questions">
        <p>
          The Autonomy page starts with guided questions designed to capture the
          most important aspects of your business. These structured prompts help
          you provide context in a format that agents can use effectively:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>What does your company do?</li>
          <li>Who are your target customers?</li>
          <li>What products or services do you offer?</li>
          <li>What are your current priorities and goals?</li>
          <li>What tone and style should agents use when representing your brand?</li>
        </ul>
        <p>
          Answering these questions gives your agents a strong foundation to work
          from across every task and schedule.
        </p>
      </ArticleSection>

      <ArticleSection title="Custom Context">
        <p>
          Beyond the guided questions, you can add free-form custom context to
          cover anything specific to your business. This is a text area where you
          can write detailed notes, paste internal documentation, or describe
          processes that agents should follow.
        </p>
        <StepList
          steps={[
            {
              title: "Navigate to the Autonomy page",
              description:
                "Open the Autonomy section from the Agents area in your sidebar.",
            },
            {
              title: "Answer the guided questions",
              description:
                "Fill in the structured prompts about your business, customers, and goals.",
            },
            {
              title: "Add custom context",
              description:
                "Use the free-form text area to provide any additional details that agents should know.",
            },
            {
              title: "Save your context",
              description:
                "Your changes are auto-saved as you type, so there is no need to click a save button.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Be Specific">
        The more specific your business context, the better your agents perform.
        Instead of writing &quot;we sell software,&quot; try &quot;we sell a B2B
        project management platform for teams of 10-50 people, priced at $15 per
        user per month, targeting mid-market companies in North America.&quot;
      </Callout>

      <ArticleSection title="How Context Affects Behavior">
        <p>
          Agents reference your autonomy context whenever they generate a
          response, run a scheduled task, or make a recommendation. For example,
          a sales agent will use your customer profile to draft more targeted
          outreach, while a financial agent will factor in your revenue goals
          when producing reports.
        </p>
        <p>
          Updating your context immediately affects future agent interactions.
          There is no delay or re-deployment step — agents always read the
          latest version of your context.
        </p>
      </ArticleSection>

      <ArticleSection title="Auto-Save">
        <p>
          All changes to your autonomy context are saved automatically as you
          type. You will see a confirmation indicator when your edits have been
          persisted. This means you can update your context incrementally
          without worrying about losing work.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
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
        ]}
      />
    </article>
  )
}
