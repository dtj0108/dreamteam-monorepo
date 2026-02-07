import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesOpportunitiesPage() {
  return (
    <article>
      <ArticleHeader
        title="Opportunities & Pipeline"
        description="Track deals through pipeline stages, set values and confidence scores, and monitor which opportunities need attention."
        readTime="8 min read"
      />

      <ArticleSection title="What Are Opportunities?">
        <p>
          An opportunity represents a potential deal tied to a lead. While a lead
          tracks the overall relationship with a company, opportunities track
          specific revenue you&apos;re working to close. A single lead can have
          multiple opportunities &mdash; for example, an initial contract and a
          follow-on upsell.
        </p>
        <p>
          Each opportunity has a value, confidence percentage, pipeline stage,
          expected close date, and an assigned owner.
        </p>
      </ArticleSection>

      <ArticleSection title="Pipeline Stages">
        <p>
          Opportunities move through pipeline stages that represent where a deal
          stands in your sales process. Each stage has a type:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Active</strong> &mdash; The deal is in progress. Examples:
            Qualification, Proposal Sent, Negotiation.
          </li>
          <li>
            <strong>Won</strong> &mdash; The deal closed successfully. Revenue is
            counted toward your pipeline total.
          </li>
          <li>
            <strong>Lost</strong> &mdash; The deal did not close. Track the reason
            so you can improve your process.
          </li>
        </ul>
        <p>
          You can create multiple pipelines for different sales motions &mdash; for
          instance, one for new business and another for renewals.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating an Opportunity">
        <StepList
          steps={[
            {
              title: "Open a lead",
              description:
                "Navigate to the lead you want to add a deal to and find the opportunities section.",
            },
            {
              title: "Click \"Add Opportunity\"",
              description:
                "Select the pipeline and initial stage for this deal.",
            },
            {
              title: "Set the value",
              description:
                "Enter the deal value in dollars. Values are stored in cents internally, so $10,000 is entered as 10000. Choose whether this is a one-time, monthly, or annual value.",
            },
            {
              title: "Set confidence",
              description:
                "Enter a confidence percentage from 0 to 100 indicating how likely this deal is to close.",
            },
            {
              title: "Set the expected close date",
              description:
                "Pick the date you expect the deal to close. This powers your forecasting and reporting.",
            },
            {
              title: "Assign an owner",
              description:
                "Choose the team member responsible for this deal. The owner receives notifications about deal activity.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="warning" title="Keep Close Dates Updated">
        Stale close dates make your pipeline forecast unreliable. Review your
        opportunities weekly and update close dates as deals progress or slip. The
        &quot;needs attention&quot; filter highlights opportunities that may be stalled.
      </Callout>

      <ArticleSection title="Tracking Deal Progress">
        <p>
          Move opportunities between pipeline stages by updating the status. Every
          status change is logged in the activity feed, giving you a clear audit
          trail of how deals progress. Use the pipeline board view for a visual
          overview of all active deals organized by stage.
        </p>
      </ArticleSection>

      <ArticleSection title="Needs Attention Filter">
        <p>
          The needs attention filter surfaces opportunities that may be stalling.
          This includes deals with overdue close dates, opportunities that haven&apos;t
          had activity recently, or deals stuck in a stage longer than expected. Use
          this filter during your weekly pipeline review to stay on top of at-risk
          revenue.
        </p>
      </ArticleSection>

      <ArticleSection title="Value and Confidence">
        <p>
          Weighted pipeline value is calculated by multiplying the deal value by the
          confidence percentage. A $50,000 deal at 60% confidence contributes $30,000
          to your weighted pipeline. Use this metric for more accurate revenue
          forecasting. You can set values as one-time, monthly, or annual depending
          on your billing model.
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
            title: "Reports & Analytics",
            href: "/learn/sales/reports",
            description: "Analyze activity and pipeline performance.",
          },
        ]}
      />
    </article>
  )
}
