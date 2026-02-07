import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesLeadsPage() {
  return (
    <article>
      <ArticleHeader
        title="Lead Management"
        description="Create, organize, and track your leads through every stage of the sales process using statuses, smart views, and bulk actions."
        readTime="7 min read"
      />

      <ArticleSection title="What Are Leads?">
        <p>
          A lead represents a company or prospect that you&apos;re pursuing as a
          potential customer. Each lead contains contacts (people), opportunities
          (deals), addresses, tasks, and a full activity history of every interaction
          your team has had.
        </p>
        <p>
          Leads are the central object in DreamTeam Sales. Everything &mdash; emails,
          calls, notes, and deals &mdash; is organized around the lead.
        </p>
      </ArticleSection>

      <ArticleSection title="Lead Statuses">
        <p>
          Every lead has a status that indicates where it sits in your pipeline.
          DreamTeam comes with default statuses like Potential, Bad Fit, and
          Qualified, but you can create custom statuses to match your sales process.
        </p>
        <p>
          Change a lead&apos;s status from the lead detail view or directly from the
          lead list. Status changes are tracked in the activity feed so you can see
          when and why a lead moved between stages.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Lead">
        <StepList
          steps={[
            {
              title: "Open the Sales workspace",
              description:
                "Navigate to Sales in the sidebar to view your lead list.",
            },
            {
              title: "Click \"+ Lead\"",
              description:
                "The new lead form appears. Enter the company name, website URL, and an optional description.",
            },
            {
              title: "Set the lead status",
              description:
                "Choose an initial status from the dropdown. This determines where the lead appears in your pipeline.",
            },
            {
              title: "Add an address",
              description:
                "Optionally add a business, mailing, or other address with city, state, ZIP, and country.",
            },
            {
              title: "Save and add contacts",
              description:
                "After creating the lead, add contacts with their email addresses and phone numbers.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Use Smart Views to Segment Your Pipeline">
        Smart views are saved searches that filter your leads by status, activity
        date, assigned user, or any combination of criteria. Pin your most important
        views to the sidebar for one-click access to key segments like &quot;Hot
        Leads&quot; or &quot;Needs Follow-Up.&quot;
      </Callout>

      <ArticleSection title="Smart Views">
        <p>
          Smart views let you create saved filters that automatically update as your
          data changes. Think of them as dynamic lists that always show the leads
          matching your criteria.
        </p>
        <p>
          Common smart views include leads not contacted in the past week, leads
          assigned to a specific rep, or leads with active opportunities over a
          certain value. You can pin smart views to the sidebar for quick access and
          share them with your team.
        </p>
      </ArticleSection>

      <ArticleSection title="Bulk Actions">
        <p>
          When you need to update multiple leads at once, use bulk actions from the
          lead list view. Select leads using the checkboxes, then choose an action
          like changing status, assigning an owner, or adding leads to a workflow
          sequence.
        </p>
      </ArticleSection>

      <ArticleSection title="CSV Import">
        <p>
          Already have leads in a spreadsheet? Use the CSV import feature to bring
          them into DreamTeam. Map your columns to lead fields, and the importer
          will create leads, contacts, and addresses automatically. You can preview
          the import before committing to catch any mapping issues.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
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
