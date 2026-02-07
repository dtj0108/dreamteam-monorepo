import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesWorkflowsPage() {
  return (
    <article>
      <ArticleHeader
        title="Workflows & Automation"
        description="Build multi-step outreach sequences that combine emails, calls, SMS, and tasks to automate your sales process."
        readTime="8 min read"
      />

      <ArticleSection title="What Are Workflows?">
        <p>
          Workflows are automated sequences of steps that execute on a schedule.
          Instead of manually remembering to follow up with every lead, you can
          build a workflow that sends an initial email, waits three days, makes a
          call, waits two more days, and sends a follow-up email &mdash; all
          automatically.
        </p>
        <p>
          Workflows keep your outreach consistent and ensure no lead falls through
          the cracks, even as your pipeline grows.
        </p>
      </ArticleSection>

      <ArticleSection title="Workflow Steps">
        <p>
          Each workflow is built from four types of steps, each with a configurable
          delay before it executes:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Email</strong> &mdash; Sends an email using a shared template.
            Choose whether to start a new thread or reply to a previous email step.
          </li>
          <li>
            <strong>Call</strong> &mdash; Creates a call task for your team. Set an
            optional timeout for how long the workflow waits for someone to attempt
            the call before moving on.
          </li>
          <li>
            <strong>SMS</strong> &mdash; Sends a text message using a shared SMS
            template.
          </li>
          <li>
            <strong>Task</strong> &mdash; Creates a to-do item with a description
            and due date. Mark it as required to block the workflow until completed,
            or optional to let the workflow continue regardless.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Creating a Workflow">
        <StepList
          steps={[
            {
              title: "Name your workflow",
              description:
                "Give the workflow a clear, descriptive name like \"Outbound Cold Sequence\" or \"Post-Demo Follow-Up.\"",
            },
            {
              title: "Add steps with delays",
              description:
                "Build your sequence by adding email, call, SMS, or task steps. Set the delay between each step (e.g., P1D for one day, P3D for three days).",
            },
            {
              title: "Configure email threading",
              description:
                "For email steps, choose \"new_thread\" to start a fresh conversation or \"old_thread\" to reply in the same thread as a previous email step.",
            },
            {
              title: "Set call timeouts",
              description:
                "For call steps, set how long the workflow waits for someone to attempt the call. Use \"forever\" to wait indefinitely until the call is made.",
            },
            {
              title: "Activate the workflow",
              description:
                "New workflows start in Draft status. Once you&apos;re satisfied with the sequence, activate it to start enrolling leads.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Start in Draft Mode">
        Always create new workflows in draft mode first. Test the sequence with a
        few internal leads to verify the timing, templates, and threading work as
        expected before activating it for your full pipeline.
      </Callout>

      <ArticleSection title="Draft, Active, and Paused States">
        <p>
          Workflows have three states that control whether they execute:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Draft</strong> &mdash; The workflow is being built or tested.
            No steps will execute automatically.
          </li>
          <li>
            <strong>Active</strong> &mdash; The workflow is live and executing steps
            for enrolled leads on schedule.
          </li>
          <li>
            <strong>Paused</strong> &mdash; The workflow is temporarily stopped.
            Enrolled leads remain in the sequence but no new steps execute until
            you resume.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Best Practices">
        <p>
          Keep your workflows focused on a single goal &mdash; don&apos;t mix cold
          outreach with post-demo follow-up in the same sequence. Use 2-4 day delays
          between touches to stay persistent without being pushy. Combine channels
          (email, call, SMS) for higher response rates, and always end with a
          breakup message that gives the prospect a clear way to re-engage later.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Email & SMS Templates",
            href: "/learn/sales/templates",
            description: "Create reusable templates with dynamic tags.",
          },
          {
            title: "Lead Management",
            href: "/learn/sales/leads",
            description: "Create, organize, and track leads with smart views.",
          },
        ]}
      />
    </article>
  )
}
