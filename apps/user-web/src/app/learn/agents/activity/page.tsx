import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsActivityPage() {
  return (
    <article>
      <ArticleHeader
        title="Activity & Approvals"
        description="Monitor your agents with the activity feed and manage pending approvals to keep operations running smoothly."
        readTime="7 min read"
      />

      <ArticleSection title="What Is the Activity Feed?">
        <p>
          The activity feed is a chronological log of everything your agents have
          done. Every chat response, scheduled execution, and tool invocation is
          recorded here with full details. Use the activity feed to audit agent
          behavior, review results, and track costs across your workspace.
        </p>
      </ArticleSection>

      <ArticleSection title="Viewing Activity">
        <StepList
          steps={[
            {
              title: "Navigate to the activity page",
              description:
                "Open the Activity section from the Agents area in your sidebar to see all recent agent executions.",
            },
            {
              title: "Browse recent executions",
              description:
                "Scroll through the feed to see completed and pending agent runs, sorted by most recent first.",
            },
            {
              title: "Click to see details",
              description:
                "Select any execution to open a detailed view with the full result, tools used, errors, and cost breakdown.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Execution Details">
        <p>
          Each execution entry in the activity feed includes several pieces of
          information to help you understand what happened:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Result summary</strong> — A preview of the agent&apos;s output
            for that run.
          </li>
          <li>
            <strong>Tools used</strong> — A list of any external tools or data
            sources the agent accessed during execution.
          </li>
          <li>
            <strong>Errors</strong> — If something went wrong, the error message
            and stack trace are displayed for debugging.
          </li>
          <li>
            <strong>Duration</strong> — How long the execution took from start to
            finish.
          </li>
          <li>
            <strong>Cost</strong> — The AI credit cost for that specific execution,
            helping you track spending per agent and per schedule.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Pending Approvals">
        <p>
          When a schedule is configured with &quot;require approval&quot; mode,
          completed executions are held in a pending state until a team member
          reviews them. Pending approvals appear at the top of the activity feed
          with a distinct visual indicator so you can spot them quickly.
        </p>
        <p>
          Agents cannot proceed with follow-up work on pending items until the
          approval is resolved, so reviewing approvals promptly keeps your
          automation running without delays.
        </p>
      </ArticleSection>

      <Callout type="warning" title="Review Approvals Promptly">
        Pending approvals block the agent from moving forward on related work.
        Check your activity feed regularly and resolve pending items to avoid
        stalling your automated workflows.
      </Callout>

      <ArticleSection title="Approve and Reject Flow">
        <StepList
          steps={[
            {
              title: "Review the pending action",
              description:
                "Open the pending execution from the activity feed and read the agent\u2019s proposed output.",
            },
            {
              title: "Check the details",
              description:
                "Review the result summary, tools used, and any supporting data the agent referenced.",
            },
            {
              title: "Click Approve or Reject",
              description:
                "Approve the action to finalize it, or reject it to discard the result. The agent is notified of your decision.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Filtering and Search">
        <p>
          The activity feed can be filtered by agent, date range, and execution
          status (completed, pending, or failed). Use filters to narrow down the
          feed when reviewing a specific agent&apos;s performance or investigating
          errors.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Schedules & Automation",
            href: "/learn/agents/schedules",
            description: "Set up recurring tasks with CRON schedules.",
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
