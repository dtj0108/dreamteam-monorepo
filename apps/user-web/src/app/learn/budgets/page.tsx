import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function BudgetsPage() {
  return (
    <article>
      <ArticleHeader
        title="Creating and Managing Budgets"
        description="Learn how to set spending limits, track your progress, and stay on top of your business finances."
        readTime="6 min read"
      />

      <ArticleSection title="Why Budgets Matter">
        <p>
          Budgets are essential for controlling your business spending. They help you:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Set clear spending limits for each category</li>
          <li>Track how much you&apos;ve spent vs. your targets</li>
          <li>Identify areas where you&apos;re overspending</li>
          <li>Plan for future expenses with confidence</li>
          <li>Make informed decisions about where to cut costs</li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Creating Your First Budget">
        <StepList
          steps={[
            {
              title: "Navigate to Budgets",
              description:
                "Click 'Budgets' in the sidebar to see your budget overview.",
            },
            {
              title: "Click 'Create Budget'",
              description:
                "Start the budget creation process by clicking the button in the top right.",
            },
            {
              title: "Name your budget",
              description:
                "Give it a descriptive name like 'Marketing Budget' or 'Office Supplies'.",
            },
            {
              title: "Set the amount",
              description:
                "Enter the maximum amount you want to spend in this category.",
            },
            {
              title: "Choose a period",
              description:
                "Select monthly, quarterly, or yearly depending on how often you want to reset.",
            },
            {
              title: "Link to a category",
              description:
                "Connect the budget to a transaction category to automatically track spending.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Start Simple">
        Begin with 3-5 budgets for your biggest spending categories. You can always add
        more as you get comfortable with the system.
      </Callout>

      <ArticleSection title="Budget Periods">
        <p>
          dreamteam.ai supports different budget periods to match how you plan:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Monthly</strong> - Most common for recurring expenses like utilities,
            subscriptions, and regular costs
          </li>
          <li>
            <strong>Quarterly</strong> - Good for seasonal expenses or larger purchases
            that happen a few times a year
          </li>
          <li>
            <strong>Yearly</strong> - Best for annual expenses like insurance, licenses,
            or major equipment purchases
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Tracking Your Progress">
        <p>
          Once you&apos;ve created budgets, dreamteam.ai automatically tracks your spending:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Progress bars</strong> - Visual indicators show how much of your
            budget you&apos;ve used
          </li>
          <li>
            <strong>Color coding</strong> - Green means on track, yellow is getting close,
            red means over budget
          </li>
          <li>
            <strong>Remaining amount</strong> - See exactly how much you have left to spend
          </li>
          <li>
            <strong>Percentage used</strong> - Quick view of your spending as a percentage
          </li>
        </ul>
      </ArticleSection>

      <Callout type="info" title="Automatic Tracking">
        Budgets automatically pull spending data from transactions with matching categories.
        Make sure to categorize your transactions for accurate budget tracking!
      </Callout>

      <ArticleSection title="Budget Alerts">
        <p>
          Set up alerts to get notified when you&apos;re approaching your limits:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Warning threshold</strong> - Get alerted at 75% (default) of your budget
          </li>
          <li>
            <strong>Critical threshold</strong> - Alert when you hit 90% of your budget
          </li>
          <li>
            <strong>Overspend alert</strong> - Know immediately when you exceed your budget
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Budget vs Actual Report">
        <p>
          For a detailed comparison of your budgets against actual spending, check out
          the Budget vs Actual report in Analytics. This report shows:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Side-by-side comparison of budgeted vs. actual amounts</li>
          <li>Variance analysis showing over/under spending</li>
          <li>Trends over time to spot patterns</li>
          <li>Recommendations for adjusting future budgets</li>
        </ul>
      </ArticleSection>

      <Callout type="warning" title="Uncategorized Transactions">
        Transactions without categories won&apos;t be counted toward any budget. Review
        your uncategorized transactions regularly to ensure accurate budget tracking.
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Working with Transactions",
            href: "/learn/transactions",
            description: "Categorize transactions for budget tracking",
          },
          {
            title: "Analytics & Reports",
            href: "/learn/analytics",
            description: "View the Budget vs Actual report",
          },
          {
            title: "Goals",
            href: "/learn/goals",
            description: "Set bigger financial targets for your business",
          },
        ]}
      />
    </article>
  )
}

