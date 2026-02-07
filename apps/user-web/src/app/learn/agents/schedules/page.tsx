import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsSchedulesPage() {
  return (
    <article>
      <ArticleHeader
        title="Schedules & Automation"
        description="Set up recurring tasks for your agents using CRON schedules so they can work automatically on a defined cadence."
        readTime="8 min read"
      />

      <ArticleSection title="What Are Schedules?">
        <p>
          Schedules let you assign recurring work to your agents. Instead of
          manually chatting with an agent every time you need a task done, you
          create a schedule that tells the agent what to do, when to do it, and
          whether the result needs your approval before being finalized.
        </p>
        <p>
          Schedules run on CRON expressions, giving you precise control over
          timing — from once a day to every five minutes. Each execution is
          logged in the activity feed with full details including duration,
          cost, and results.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Schedule">
        <StepList
          steps={[
            {
              title: "Go to agent schedules",
              description:
                "Navigate to the Schedules page from the agent list or click the schedules tab on an agent\u2019s detail page.",
            },
            {
              title: "Click Create",
              description:
                "Press the Create button to open the schedule creation form.",
            },
            {
              title: "Enter a description",
              description:
                "Write a clear description of what the agent should do on each run. Be specific about the expected output.",
            },
            {
              title: "Set the CRON expression",
              description:
                "Define when the schedule runs using a CRON expression. The platform shows a human-readable preview of the timing.",
            },
            {
              title: "Choose a timezone",
              description:
                "Select the timezone for the schedule so runs align with your business hours.",
            },
            {
              title: "Set approval mode",
              description:
                "Choose whether executions are auto-approved or require manual review before being finalized.",
            },
            {
              title: "Enable the schedule",
              description:
                "Toggle the schedule on to start it. It will execute at the next matching time based on your CRON expression.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="CRON Expressions">
        <p>
          CRON expressions define the timing pattern for schedule runs. Here are
          some common patterns:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>0 9 * * *</strong> — Every day at 9:00 AM.
          </li>
          <li>
            <strong>0 9 * * 1</strong> — Every Monday at 9:00 AM.
          </li>
          <li>
            <strong>0 */2 * * *</strong> — Every 2 hours.
          </li>
          <li>
            <strong>0 9 1 * *</strong> — First day of every month at 9:00 AM.
          </li>
          <li>
            <strong>*/30 * * * *</strong> — Every 30 minutes.
          </li>
        </ul>
        <p>
          The schedule form includes a preview that translates the CRON
          expression into plain language, so you can verify the timing before
          saving.
        </p>
      </ArticleSection>

      <ArticleSection title="Approval Mode">
        <p>
          Each schedule can be set to one of two approval modes:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Auto-approve</strong> — The agent&apos;s output is accepted
            automatically. Use this for low-risk, routine tasks.
          </li>
          <li>
            <strong>Require approval</strong> — The output is held as pending
            until a team member reviews and approves or rejects it. Use this
            for tasks where accuracy is critical.
          </li>
        </ul>
      </ArticleSection>

      <Callout type="warning" title="Monitor Execution Costs">
        Each schedule run consumes AI credits. Review the cost column in your
        schedule execution history regularly to make sure spending stays within
        expectations, especially for high-frequency schedules.
      </Callout>

      <ArticleSection title="Enable and Disable">
        <p>
          You can toggle any schedule on or off at any time. Disabling a schedule
          stops future runs without deleting the configuration. Re-enable it
          whenever you want to resume.
        </p>
      </ArticleSection>

      <ArticleSection title="Execution History and Cost Tracking">
        <p>
          Every schedule run is recorded in the execution history. You can view
          the result summary, duration, tools used, and cost for each run. This
          helps you track agent performance over time and optimize scheduling
          frequency based on value delivered.
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
            title: "Activity & Approvals",
            href: "/learn/agents/activity",
            description: "Review activity feeds and approve pending actions.",
          },
        ]}
      />
    </article>
  )
}
