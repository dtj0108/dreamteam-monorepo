import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgeCategoriesPage() {
  return (
    <article>
      <ArticleHeader
        title="Categories & Organization"
        description="Use color-coded categories to group related pages and keep your knowledge base easy to navigate."
        readTime="5 min read"
      />

      <ArticleSection title="What Are Categories?">
        <p>
          Categories in dreamteam.ai are labels you assign to knowledge pages to
          group them by topic, department, or any classification that makes sense
          for your team. Each category has a name and a color, making it easy to
          visually identify related content at a glance.
        </p>
        <p>
          Unlike folders, categories are non-hierarchical tags. A single page can
          belong to one category, and you can filter the entire knowledge base by
          category to quickly find what you need.
        </p>
      </ArticleSection>

      <ArticleSection title="Color-Coded Categories">
        <p>
          Every category is assigned a color that appears as a badge on pages in
          the All Pages view and sidebar. This visual system helps your team
          instantly distinguish between different types of content &mdash; for
          example, blue for Engineering, green for Sales, and orange for
          Operations.
        </p>
        <p>
          Choose colors that are meaningful and consistent across your workspace.
          When everyone recognizes the color coding, scanning through pages
          becomes fast and intuitive.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Category">
        <StepList
          steps={[
            {
              title: "Go to the Categories section",
              description:
                "In the Knowledge sidebar, click on Categories to view all existing categories.",
            },
            {
              title: "Click Create Category",
              description:
                "Click the Create button to open the new category form.",
            },
            {
              title: "Name your category",
              description:
                "Enter a clear, descriptive name like \"Engineering\", \"HR Policies\", or \"Product Specs\".",
            },
            {
              title: "Choose a color",
              description:
                "Select a color from the palette. This color will appear as a badge on all pages assigned to this category.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Assigning Categories to Pages">
        <p>
          When creating or editing a page, you can assign it to a category using
          the category dropdown. The selected category&apos;s color badge will
          then appear alongside the page title in lists and search results,
          making it easy for teammates to identify what type of content they are
          looking at.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Consistent Color Coding">
        Agree on a color scheme with your team early on. For example, use red for
        urgent policies, blue for technical docs, and green for customer-facing
        content. Consistency makes scanning faster for everyone.
      </Callout>

      <ArticleSection title="Filtering by Category">
        <p>
          Use the category filter in the All Pages view to narrow down the list
          to only pages in a specific category. This is especially helpful in
          larger knowledge bases where dozens or hundreds of pages exist. You can
          also combine category filtering with the search bar to find exactly
          what you need.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Pages & Editor",
            href: "/learn/knowledge/pages",
            description: "Create and edit rich content pages.",
          },
          {
            title: "Search & Favorites",
            href: "/learn/knowledge/search",
            description: "Find pages quickly with search and favorites.",
          },
        ]}
      />
    </article>
  )
}
