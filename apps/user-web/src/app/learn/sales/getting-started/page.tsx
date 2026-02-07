import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesGettingStartedPage() {
  return (
    <article>
      <ArticleHeader
        title="Getting Started with Sales"
        description="Set up your sales workspace, create your first lead, and learn the core concepts that power your pipeline."
        readTime="6 min read"
      />

      <ArticleSection title="Welcome to Sales">
        <p>
          The Sales module in DreamTeam gives you everything you need to manage your
          pipeline from first touch to closed deal. Whether you&apos;re a solo founder or
          part of a growing team, you&apos;ll find tools for lead tracking, contact
          management, opportunity pipelines, and automated outreach sequences.
        </p>
        <p>
          This guide walks you through the essential first steps so you can start
          selling faster.
        </p>
      </ArticleSection>

      <ArticleSection title="Your First Steps">
        <StepList
          steps={[
            {
              title: "Navigate to the Sales sidebar",
              description:
                "Click the Sales icon in the left sidebar to open the sales workspace. You&apos;ll see your lead list, pipeline, and activity feed.",
            },
            {
              title: "Create your first lead",
              description:
                "Click the \"+ Lead\" button to add a company or prospect. Give it a name, optional website URL, and a description.",
            },
            {
              title: "Add a contact",
              description:
                "Inside the lead, click \"Add Contact\" to attach a person. Include their name, title, email address, and phone number.",
            },
            {
              title: "Create an opportunity",
              description:
                "Add a deal to your lead with a value, confidence percentage, and expected close date. Assign it to a pipeline stage.",
            },
            {
              title: "Explore smart views",
              description:
                "Use the smart views panel to filter leads by status, activity, or custom criteria. Pin your most-used views to the sidebar.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Start Small">
        Begin with a handful of test leads to get comfortable with the interface.
        You can always import your full contact list later via CSV or integrations.
      </Callout>

      <ArticleSection title="Key Concepts">
        <p>
          Understanding these core objects will help you navigate the sales workspace
          confidently:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Leads</strong> &mdash; Companies or prospects you&apos;re pursuing.
            Each lead has a status, contacts, opportunities, and activity history.
          </li>
          <li>
            <strong>Contacts</strong> &mdash; People associated with a lead. Each
            contact can have multiple emails, phone numbers, and URLs.
          </li>
          <li>
            <strong>Opportunities</strong> &mdash; Deals tied to a lead with a value,
            confidence score, pipeline stage, and expected close date.
          </li>
          <li>
            <strong>Pipelines</strong> &mdash; Visual stages that opportunities move
            through (e.g., Qualification, Proposal, Negotiation, Closed Won).
          </li>
          <li>
            <strong>Smart Views</strong> &mdash; Saved searches and filters that let
            you segment your leads by any criteria.
          </li>
          <li>
            <strong>Workflows</strong> &mdash; Automated multi-step sequences that
            combine emails, calls, SMS, and tasks on a schedule.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Understanding the Sidebar">
        <p>
          The Sales sidebar is your command center. From here you can access your lead
          list, pinned smart views, opportunity pipeline, inbox, and reporting
          dashboards. Use the sidebar to quickly switch between different areas of
          your sales workspace without losing context.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
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
        ]}
      />
    </article>
  )
}
