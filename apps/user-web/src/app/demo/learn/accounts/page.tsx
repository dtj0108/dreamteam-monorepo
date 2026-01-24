import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function DemoAccountsPage() {
  return (
    <article>
      <ArticleHeader
        title="Managing Accounts"
        description="Learn how to add, edit, and organize your bank accounts, credit cards, and cash reserves."
        readTime="4 min read"
      />

      <ArticleSection title="What Are Accounts?">
        <p>
          Accounts in dreamteam.ai represent your real-world financial accounts - bank accounts,
          credit cards, payment processors, or even cash on hand. Each account tracks its
          own balance and transactions.
        </p>
        <p>
          Organizing your money into separate accounts helps you see exactly where your
          funds are and how money flows through your business.
        </p>
      </ArticleSection>

      <ArticleSection title="Account Types">
        <p>
          dreamteam.ai supports several account types to match your business needs:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Checking</strong> - Your primary business bank account for daily operations
          </li>
          <li>
            <strong>Savings</strong> - Reserved funds for emergencies or future investments
          </li>
          <li>
            <strong>Credit Card</strong> - Track credit card spending and payments
          </li>
          <li>
            <strong>Cash</strong> - Physical cash or petty cash funds
          </li>
          <li>
            <strong>Investment</strong> - Business investment accounts
          </li>
          <li>
            <strong>Other</strong> - Any account that doesn&apos;t fit the above categories
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Adding a New Account">
        <StepList
          steps={[
            {
              title: "Navigate to Accounts",
              description:
                "Click on 'Accounts' in the sidebar, then click 'Add Account' or go directly to /accounts/new.",
            },
            {
              title: "Enter account details",
              description:
                "Provide a name (e.g., 'Business Checking'), select the account type, and enter the current balance.",
            },
            {
              title: "Save your account",
              description:
                "Click 'Create Account' to save. Your new account will appear in the accounts list.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Naming Best Practice">
        Use descriptive names that help you identify accounts quickly. Include the bank name
        or purpose, like &quot;Chase Business Checking&quot; or &quot;Stripe Balance&quot;.
      </Callout>

      <ArticleSection title="Understanding Balances">
        <p>
          Account balances update automatically as you add transactions. Here&apos;s how it works:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Income transactions</strong> (positive amounts) increase the balance
          </li>
          <li>
            <strong>Expense transactions</strong> (negative amounts) decrease the balance
          </li>
          <li>
            <strong>Initial balance</strong> is what you enter when creating the account
          </li>
        </ul>
      </ArticleSection>

      <Callout type="warning" title="Keep Balances Accurate">
        Periodically reconcile your dreamteam.ai account balances with your actual bank
        statements. This helps catch any missing or duplicate transactions.
      </Callout>

      <ArticleSection title="Editing and Deleting Accounts">
        <p>
          You can edit account details at any time by clicking on an account in the list.
          Update the name, type, or make balance adjustments as needed.
        </p>
        <p>
          Deleting an account will also remove all transactions associated with it. Be
          careful when deleting - this action cannot be undone!
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Working with Transactions",
            href: "/demo/learn/transactions",
            description: "Learn how to add and categorize transactions",
          },
          {
            title: "Analytics & Reports",
            href: "/demo/learn/analytics",
            description: "View reports across all your accounts",
          },
        ]}
      />
    </article>
  )
}

