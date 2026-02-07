import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesReportsPage() {
  return (
    <article>
      <ArticleHeader
        title="Reports & Analytics"
        description="Analyze your team&apos;s activity, track pipeline performance, and make data-driven decisions with aggregation reports."
        readTime="6 min read"
      />

      <ArticleSection title="What Are Reports?">
        <p>
          DreamTeam Reports give you visibility into your sales activity and pipeline
          health. Use aggregations to answer questions like &quot;How many calls did
          each rep make this week?&quot; or &quot;What&apos;s our total pipeline value
          by stage?&quot;
        </p>
        <p>
          Reports are built from real-time data, so the numbers always reflect the
          current state of your pipeline. Display results as tables, bar charts, or
          line charts depending on what story the data tells.
        </p>
      </ArticleSection>

      <ArticleSection title="Activity Aggregations">
        <p>
          Track the volume and distribution of sales activities across your team.
          Common activity reports include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Calls by user</strong> &mdash; See who&apos;s making the most
            calls and identify coaching opportunities.
          </li>
          <li>
            <strong>Emails sent by day</strong> &mdash; Track outreach cadence over
            time using date-based grouping.
          </li>
          <li>
            <strong>Meetings this week</strong> &mdash; Count meetings scheduled and
            completed to measure engagement.
          </li>
          <li>
            <strong>SMS volume</strong> &mdash; Monitor text message activity
            alongside email and call metrics.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Pipeline Analytics">
        <p>
          Understand the health of your pipeline with opportunity-focused reports:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Total value by stage</strong> &mdash; Sum opportunity values
            grouped by pipeline status to see where revenue sits.
          </li>
          <li>
            <strong>Average confidence</strong> &mdash; Track deal confidence across
            stages to identify where deals tend to stall.
          </li>
          <li>
            <strong>Won vs Lost</strong> &mdash; Compare closed-won and closed-lost
            deal counts and values over time.
          </li>
          <li>
            <strong>Weighted pipeline</strong> &mdash; Multiply values by confidence
            for a more realistic revenue forecast.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Grouping and Filtering">
        <p>
          Reports support up to two group-by dimensions. Group by user to compare
          rep performance, by lead status to see activity distribution, or by date
          to spot trends over time. Combine groupings for deeper analysis &mdash;
          for example, calls by user by week.
        </p>
        <p>
          Use filters to narrow the data to specific time periods, users, lead
          segments, or opportunity statuses. Smart view filters can be applied to
          reports for consistent segmentation across your dashboard and reports.
        </p>
      </ArticleSection>

      <ArticleSection title="Date Ranges and Intervals">
        <p>
          Set custom date ranges for any report using start and end dates. Choose
          an interval (day, week, month, quarter, year) to control how time-series
          data is bucketed. DreamTeam automatically selects the best interval based
          on your date range, but you can override it for more granular or
          higher-level views.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Weekly Activity Reviews">
        Set up a weekly report that shows calls, emails, and meetings by user for
        the past 7 days. Review it every Monday to celebrate wins, identify gaps,
        and adjust your team&apos;s focus for the week ahead.
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Opportunities & Pipeline",
            href: "/learn/sales/opportunities",
            description: "Track deals through pipeline stages to close.",
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
