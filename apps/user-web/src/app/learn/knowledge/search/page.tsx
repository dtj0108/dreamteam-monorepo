import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgeSearchPage() {
  return (
    <article>
      <ArticleHeader
        title="Search & Favorites"
        description="Quickly find the pages you need and keep your most-referenced content one click away."
        readTime="4 min read"
      />

      <ArticleSection title="What Is Search?">
        <p>
          The Knowledge search in dreamteam.ai lets you find any page or
          whiteboard by typing keywords into the search bar. Search looks at page
          titles and content, returning results ranked by relevance so you can
          jump straight to the information you need.
        </p>
        <p>
          As your knowledge base grows, search becomes the fastest way to
          navigate &mdash; much quicker than browsing through categories or
          scrolling the All Pages list.
        </p>
      </ArticleSection>

      <ArticleSection title="Searching for Pages">
        <StepList
          steps={[
            {
              title: "Click the search bar",
              description:
                "Open the Knowledge section and click the search bar at the top of the page list.",
            },
            {
              title: "Enter your query",
              description:
                "Type keywords related to the page you are looking for. Results update as you type.",
            },
            {
              title: "Browse results",
              description:
                "Review the matching pages and click on one to open it. Results show the page title, category, and a content preview.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Marking Favorites">
        <p>
          Favorites let you pin important pages to the top of your Knowledge
          sidebar for instant access. To favorite a page, click the star icon
          next to its title. Favorited pages appear in a dedicated Favorites
          section at the top of the sidebar, so you never have to search for
          content you reference regularly.
        </p>
        <p>
          Favorites are personal to your account &mdash; each team member can
          customize their own list without affecting anyone else&apos;s view.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Favorite Your Go-To Pages">
        Star the pages you reference most often &mdash; team SOPs, onboarding
        checklists, or architecture guides. Having them in your Favorites
        section saves time every day.
      </Callout>

      <ArticleSection title="The All Pages View">
        <p>
          The All Pages view shows every page in your knowledge base in a single
          list, sorted by last updated. You can filter this list by category,
          search within it, and sort by different criteria. This view is the
          default landing page when you open Knowledge and gives you a complete
          overview of your team&apos;s documentation.
        </p>
      </ArticleSection>

      <ArticleSection title="Sidebar Navigation">
        <p>
          The Knowledge sidebar provides a structured way to browse your content.
          At the top you&apos;ll find your Favorites for quick access, followed
          by Categories for filtered browsing, and then links to All Pages,
          Templates, and Whiteboards. Use the sidebar to navigate between
          different views without losing context.
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
            title: "Categories & Organization",
            href: "/learn/knowledge/categories",
            description: "Organize pages with color-coded categories.",
          },
        ]}
      />
    </article>
  )
}
