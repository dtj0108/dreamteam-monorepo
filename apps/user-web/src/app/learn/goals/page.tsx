import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function GoalsPage() {
  return (
    <article>
      <ArticleHeader
        title="Setting and Tracking Goals"
        description="Plan for success with revenue targets, profit goals, and exit planning."
        readTime="6 min read"
      />

      <ArticleSection title="The Power of Financial Goals">
        <p>
          Goals transform your business from reactive to proactive. Instead of just
          tracking what happened, you&apos;re actively working toward specific targets.
          dreamteam.ai supports three types of goals to cover every stage of your business:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Revenue Goals</strong> - Target income amounts to grow your top line
          </li>
          <li>
            <strong>Profit Goals</strong> - Net income targets to ensure sustainable growth
          </li>
          <li>
            <strong>Exit Planning</strong> - Long-term planning for selling or transitioning
            your business
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Revenue Goals">
        <p>
          Revenue goals help you focus on growing your business income. They&apos;re perfect for:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Monthly or quarterly sales targets</li>
          <li>Annual revenue milestones</li>
          <li>Product launch income goals</li>
          <li>Seasonal revenue planning</li>
        </ul>

        <StepList
          steps={[
            {
              title: "Go to Goals",
              description:
                "Click on the Revenue section in the sidebar under Goals.",
            },
            {
              title: "Create a new goal",
              description:
                "Click 'Create Goal' and enter a target amount and deadline.",
            },
            {
              title: "Track progress",
              description:
                "Your progress updates automatically based on income transactions.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="SMART Goals">
        Make your goals Specific, Measurable, Achievable, Relevant, and Time-bound.
        Instead of &quot;make more money,&quot; try &quot;reach $50,000 monthly revenue by Q4.&quot;
      </Callout>

      <ArticleSection title="Profit Goals">
        <p>
          Revenue is vanity, profit is sanity. Profit goals ensure your growth is
          sustainable by tracking what you actually keep after expenses.
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>Set net profit margin targets (e.g., 20% profit margin)</li>
          <li>Track absolute profit amounts per month or quarter</li>
          <li>Monitor cost efficiency alongside revenue growth</li>
        </ul>

        <StepList
          steps={[
            {
              title: "Navigate to Profit Goals",
              description:
                "Click on the Profit section in the sidebar under Goals.",
            },
            {
              title: "Define your target",
              description:
                "Set a profit amount or percentage you want to achieve.",
            },
            {
              title: "Monitor both sides",
              description:
                "Profit goals consider both income and expenses, so manage both to hit your target.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="info" title="Profit = Income - Expenses">
        Remember, profit goals require you to both grow revenue AND control costs.
        Use budgets to manage the expense side of the equation.
      </Callout>

      <ArticleSection title="Exit Planning">
        <p>
          Every business owner should have an exit strategy, whether you&apos;re planning to
          sell in 5 years or 20. dreamteam.ai&apos;s Exit Readiness Dashboard helps you track:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Target Valuation</strong> - The price you want to sell your business for
          </li>
          <li>
            <strong>Revenue Multiple</strong> - Common valuation metric (typically 2-5x annual revenue)
          </li>
          <li>
            <strong>Runway</strong> - How many months of expenses you have in reserves
          </li>
          <li>
            <strong>Target Exit Date</strong> - When you plan to exit
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Understanding Exit Metrics">
        <p>
          The Exit Readiness Dashboard tracks several key metrics:
        </p>

        <h3 className="font-semibold mt-6 mb-2">Revenue Multiple</h3>
        <p>
          Most businesses are valued as a multiple of their annual revenue. A 3x multiple
          means a business making $100,000/year might sell for $300,000. Track your
          current multiple to see if you&apos;re on target.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Cash Runway</h3>
        <p>
          How many months could your business survive with zero revenue? Buyers want to
          see healthy reserves. Aim for at least 6-12 months of runway.
        </p>

        <h3 className="font-semibold mt-6 mb-2">Profit Consistency</h3>
        <p>
          Consistent profits are more attractive than volatile ones. The dashboard
          tracks your profit history to show stability.
        </p>
      </ArticleSection>

      <Callout type="warning" title="Long-Term Planning">
        Exit planning isn&apos;t about leaving tomorrow - it&apos;s about building a business
        that&apos;s worth buying. Start tracking these metrics early, even if you don&apos;t
        plan to sell for years.
      </Callout>

      <ArticleSection title="Viewing Your Goals">
        <p>
          Goals appear in the sidebar for quick access. You can:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>See progress at a glance with visual indicators</li>
          <li>Click on any goal type to see detailed tracking</li>
          <li>Add new goals or edit existing ones</li>
          <li>View historical goal completion</li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Best Practices">
        <p>
          Get the most out of your financial goals:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Start with revenue</strong> - It&apos;s the foundation for profit and exit goals
          </li>
          <li>
            <strong>Review monthly</strong> - Check progress and adjust strategies as needed
          </li>
          <li>
            <strong>Be realistic</strong> - Stretch goals are good, but impossible ones are demotivating
          </li>
          <li>
            <strong>Celebrate wins</strong> - Acknowledge when you hit milestones
          </li>
          <li>
            <strong>Adjust as needed</strong> - Business conditions change; your goals can too
          </li>
        </ul>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Analytics & Reports",
            href: "/learn/analytics",
            description: "Use reports to track goal progress",
          },
          {
            title: "Creating Budgets",
            href: "/learn/budgets",
            description: "Control expenses to hit profit goals",
          },
          {
            title: "Getting Started",
            href: "/learn/getting-started",
            description: "Review the basics of dreamteam.ai",
          },
        ]}
      />
    </article>
  )
}

