import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function AnalyticsPage() {
  return (
    <article>
      <ArticleHeader
        title="Analytics & Reports"
        description="Understand your business finances with powerful reports and visual insights."
        readTime="8 min read"
      />

      <ArticleSection title="Why Analytics Matter">
        <p>
          Raw transaction data only tells part of the story. Analytics transform your
          financial data into actionable insights that help you:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Understand your true profitability</li>
          <li>Identify spending patterns and trends</li>
          <li>Make data-driven business decisions</li>
          <li>Plan for taxes and future expenses</li>
          <li>Track progress toward financial goals</li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Available Reports">
        <p>
          dreamteam.ai includes several pre-built reports to analyze your finances:
        </p>

        <h3 className="font-semibold mt-6 mb-2">Profit & Loss (P&L)</h3>
        <p>
          The most important report for any business. Shows your total income, total
          expenses, and net profit over a selected time period. Includes breakdowns by
          category so you can see exactly where money comes from and goes.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Cash Flow</h3>
        <p>
          Track how money moves in and out of your business over time. The cash flow
          chart shows daily or monthly net cash movement, helping you spot patterns and
          plan for slow periods.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Expense Analysis</h3>
        <p>
          Deep dive into your spending. See a pie chart breakdown of expenses by category,
          identify your biggest cost centers, and track expense trends over time.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Income Analysis</h3>
        <p>
          Understand your revenue streams. View income by category, spot seasonal patterns,
          and identify your most profitable products or services.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Budget vs Actual</h3>
        <p>
          Compare your budgeted amounts against actual spending. See which categories
          are on track and which need attention.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Date Range Selection">
        All reports include a date range selector. Use it to view data for this month,
        last quarter, year-to-date, or any custom period you need.
      </Callout>

      <ArticleSection title="Using the Analytics Dashboard">
        <StepList
          steps={[
            {
              title: "Navigate to Analytics",
              description:
                "Click 'Analytics' in the sidebar to see the overview dashboard.",
            },
            {
              title: "Select a date range",
              description:
                "Use the date picker to choose the time period you want to analyze.",
            },
            {
              title: "Review the summary",
              description:
                "The overview shows key metrics like total income, expenses, and net profit.",
            },
            {
              title: "Dive into specific reports",
              description:
                "Click on individual reports like P&L or Cash Flow for detailed analysis.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Understanding Charts">
        <p>
          dreamteam.ai uses several chart types to visualize your data:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Line charts</strong> - Show trends over time, like monthly income growth
          </li>
          <li>
            <strong>Bar charts</strong> - Compare amounts between categories or time periods
          </li>
          <li>
            <strong>Pie charts</strong> - Display proportions, like expense distribution
          </li>
          <li>
            <strong>Area charts</strong> - Visualize cumulative values and cash flow
          </li>
        </ul>
      </ArticleSection>

      <Callout type="info" title="Data Quality">
        Reports are only as good as your data. Make sure to categorize all your
        transactions and regularly add new entries for the most accurate insights.
      </Callout>

      <ArticleSection title="Custom Reports">
        <p>
          Need something specific? The Custom Report builder lets you:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Choose specific categories to include or exclude</li>
          <li>Filter by account or transaction type</li>
          <li>Select custom date ranges</li>
          <li>Choose your preferred chart format</li>
          <li>Export data for external analysis</li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Best Practices for Analysis">
        <p>
          Get the most out of your analytics with these tips:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Review weekly</strong> - Check your cash flow and recent transactions
            at least once a week
          </li>
          <li>
            <strong>Monthly deep-dive</strong> - Run a full P&L and expense analysis at
            month end
          </li>
          <li>
            <strong>Compare periods</strong> - Look at this month vs. last month or
            year-over-year to spot trends
          </li>
          <li>
            <strong>Set benchmarks</strong> - Know what good looks like for your industry
            and compare against it
          </li>
        </ul>
      </ArticleSection>

      <Callout type="warning" title="Uncategorized Data">
        Transactions without categories appear as &quot;Uncategorized&quot; in reports. For the
        clearest insights, keep uncategorized transactions to a minimum.
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Working with Transactions",
            href: "/learn/transactions",
            description: "Ensure your data is categorized correctly",
          },
          {
            title: "Creating Budgets",
            href: "/learn/budgets",
            description: "Set budgets to compare against actuals",
          },
          {
            title: "Goals",
            href: "/learn/goals",
            description: "Track progress toward your financial targets",
          },
        ]}
      />
    </article>
  )
}

