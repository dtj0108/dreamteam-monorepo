import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function TransactionsPage() {
  return (
    <article>
      <ArticleHeader
        title="Working with Transactions"
        description="Master transaction management - from manual entry to CSV imports and AI-powered categorization."
        readTime="7 min read"
      />

      <ArticleSection title="What Are Transactions?">
        <p>
          Transactions are the building blocks of your financial data. Every time money
          enters or leaves your business, that&apos;s a transaction. dreamteam.ai helps you
          track, categorize, and analyze all your transactions in one place.
        </p>
        <p>
          Transactions can be positive (income) or negative (expenses), and each one
          belongs to an account and optionally a category.
        </p>
      </ArticleSection>

      <ArticleSection title="Adding Transactions Manually">
        <StepList
          steps={[
            {
              title: "Go to Transactions",
              description:
                "Click 'Transactions' in the sidebar, then 'Add Transaction' or navigate to /transactions/new.",
            },
            {
              title: "Select an account",
              description:
                "Choose which account this transaction belongs to (e.g., your business checking account).",
            },
            {
              title: "Enter the details",
              description:
                "Add a description, amount (positive for income, negative for expenses), and date.",
            },
            {
              title: "Choose a category",
              description:
                "Select a category to organize this transaction. This helps with budgeting and reports.",
            },
            {
              title: "Save the transaction",
              description:
                "Click 'Create Transaction' to save. It will appear in your transaction list and update your account balance.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Quick Entry Tip">
        For expenses, enter negative amounts (e.g., -150.00). For income, enter positive
        amounts (e.g., 500.00). This keeps your accounting accurate.
      </Callout>

      <ArticleSection title="Importing Transactions from CSV">
        <p>
          Save time by importing transactions from your bank statements. Most banks let
          you export your transactions as a CSV file.
        </p>
        <StepList
          steps={[
            {
              title: "Export from your bank",
              description:
                "Log into your online banking and download your transactions as a CSV file.",
            },
            {
              title: "Go to Import CSV",
              description:
                "Navigate to Transactions → Import CSV in the sidebar.",
            },
            {
              title: "Upload your file",
              description:
                "Drag and drop your CSV file or click to browse and select it.",
            },
            {
              title: "Map columns",
              description:
                "Tell dreamteam.ai which columns contain the date, description, and amount.",
            },
            {
              title: "Select target account",
              description:
                "Choose which account these transactions belong to.",
            },
            {
              title: "Review and import",
              description:
                "Preview the transactions, then click Import to add them to your account.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="info" title="Supported Formats">
        dreamteam.ai supports CSV files from most major banks and payment processors like
        Stripe. The importer is flexible and can handle different column layouts.
      </Callout>

      <ArticleSection title="Categorizing Transactions">
        <p>
          Categories help you understand where your money goes. You can categorize
          transactions in several ways:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>When creating</strong> - Select a category during transaction entry
          </li>
          <li>
            <strong>Individual edit</strong> - Click on any transaction to change its category
          </li>
          <li>
            <strong>Bulk categorization</strong> - Select multiple transactions and assign
            a category to all of them at once
          </li>
          <li>
            <strong>AI categorization</strong> - Use our AI feature to automatically
            suggest categories based on transaction descriptions
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Bulk Actions">
        <p>
          Working with many transactions? Use bulk actions to save time:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Select transactions</strong> - Use the checkboxes on the left side of the table
          </li>
          <li>
            <strong>Set Category</strong> - Assign the same category to all selected transactions
          </li>
          <li>
            <strong>AI Categorize</strong> - Let AI suggest categories for selected transactions
          </li>
          <li>
            <strong>Delete</strong> - Remove multiple transactions at once (use with caution!)
          </li>
        </ul>
      </ArticleSection>

      <Callout type="warning" title="Deleting Transactions">
        Deleting transactions will affect your account balances and historical reports.
        Make sure you really want to remove them before confirming.
      </Callout>

      <ArticleSection title="Filtering and Searching">
        <p>
          The transactions table includes powerful filtering options:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3">
          <li>
            <strong>Search</strong> - Find transactions by description text
          </li>
          <li>
            <strong>Date range</strong> - View transactions from a specific time period
          </li>
          <li>
            <strong>Account filter</strong> - Show only transactions from one account
          </li>
          <li>
            <strong>Category filter</strong> - Focus on a specific spending category
          </li>
          <li>
            <strong>Column visibility</strong> - Show or hide columns to customize your view
          </li>
        </ul>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Managing Accounts",
            href: "/learn/accounts",
            description: "Set up accounts to organize your transactions",
          },
          {
            title: "Setting Up Budgets",
            href: "/learn/budgets",
            description: "Create budgets based on your transaction categories",
          },
          {
            title: "Analytics & Reports",
            href: "/learn/analytics",
            description: "Analyze your transaction data with reports",
          },
        ]}
      />
    </article>
  )
}

