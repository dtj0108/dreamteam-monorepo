import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function GettingStartedPage() {
  return (
    <article>
      <ArticleHeader
        title="Getting Started with dreamteam.ai"
        description="Learn the fundamentals and get your business finances organized in just a few minutes."
        readTime="5 min read"
      />

      <ArticleSection title="Welcome to dreamteam.ai">
        <p>
          dreamteam.ai is your all-in-one business finance management platform. Whether you&apos;re
          a small business owner, freelancer, or startup founder, we help you track income,
          manage expenses, set budgets, and plan for the future.
        </p>
        <p>
          This guide will walk you through the essential steps to get started and make the
          most of your financial data.
        </p>
      </ArticleSection>

      <ArticleSection title="Your First Steps">
        <StepList
          steps={[
            {
              title: "Create your first account",
              description:
                "Add a bank account, credit card, or cash account to start tracking your money. Go to Accounts → Add Account.",
            },
            {
              title: "Add some transactions",
              description:
                "Record your income and expenses manually, or import them from a CSV file exported from your bank.",
            },
            {
              title: "Set up categories",
              description:
                "Use our default business categories or customize them to match your business needs in Customize → Categories.",
            },
            {
              title: "Create a budget",
              description:
                "Set spending limits for different categories to keep your finances on track. Go to Budgets to get started.",
            },
            {
              title: "Explore your analytics",
              description:
                "View reports like Profit & Loss, Cash Flow, and Expense breakdowns to understand your financial health.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Pro Tip">
        Start by importing your last 3 months of bank statements. This gives you enough
        historical data to see meaningful trends in your analytics.
      </Callout>

      <ArticleSection title="Understanding the Dashboard">
        <p>
          Your dashboard is your financial command center. Here&apos;s what you&apos;ll find:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Summary Cards</strong> - Quick view of income, expenses, and net profit
            for this month and all time
          </li>
          <li>
            <strong>Recent Transactions</strong> - Your latest financial activity at a glance
          </li>
          <li>
            <strong>Goals Progress</strong> - Track your revenue, profit, and exit goals
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Key Concepts">
        <p>
          Here are some important terms you&apos;ll encounter:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Accounts</strong> - Your bank accounts, credit cards, or cash reserves
          </li>
          <li>
            <strong>Transactions</strong> - Individual income or expense entries
          </li>
          <li>
            <strong>Categories</strong> - Labels that help you organize and analyze spending
          </li>
          <li>
            <strong>Budgets</strong> - Spending limits you set for specific categories
          </li>
          <li>
            <strong>Goals</strong> - Revenue, profit, or exit targets you&apos;re working toward
          </li>
        </ul>
      </ArticleSection>

      <Callout type="info" title="Need Help?">
        Explore the other articles in this Learning Center to dive deeper into each feature.
        We&apos;re constantly adding new guides and tips!
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Managing Accounts",
            href: "/learn/accounts",
            description: "Learn how to add and manage your bank accounts",
          },
          {
            title: "Working with Transactions",
            href: "/learn/transactions",
            description: "Track income and expenses effectively",
          },
          {
            title: "Setting Up Budgets",
            href: "/learn/budgets",
            description: "Control your spending with budgets",
          },
        ]}
      />
    </article>
  )
}

