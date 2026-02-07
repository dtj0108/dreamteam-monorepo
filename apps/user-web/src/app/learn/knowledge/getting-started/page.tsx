import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgeGettingStartedPage() {
  return (
    <article>
      <ArticleHeader
        title="Getting Started with Knowledge"
        description="Build a centralized knowledge base so your team always has the information they need, right where they work."
        readTime="5 min read"
      />

      <ArticleSection title="Welcome to Knowledge">
        <p>
          The Knowledge module in dreamteam.ai gives your team a shared space to
          create, organize, and discover important documentation. From SOPs and
          onboarding guides to meeting notes and project wikis, everything lives
          in one searchable place.
        </p>
        <p>
          Whether you&apos;re a founder documenting processes for the first time or a
          team lead standardizing how your group operates, Knowledge helps you
          turn tribal knowledge into a reliable, living resource.
        </p>
      </ArticleSection>

      <ArticleSection title="Your First Steps">
        <p>
          Follow these steps to set up your knowledge base and start creating
          content right away.
        </p>
        <StepList
          steps={[
            {
              title: "Open Knowledge from the sidebar",
              description:
                "Click the Knowledge icon in the main sidebar to open the knowledge base. You will see the All Pages view by default.",
            },
            {
              title: "Browse existing pages",
              description:
                "If your workspace already has pages, scroll through the list or use the search bar to explore what is available.",
            },
            {
              title: "Create your first page",
              description:
                "Click the New Page button in the top-right corner. Give it a title, write your content using the rich editor, and save.",
            },
            {
              title: "Add a category",
              description:
                "Navigate to the Categories section and create a category with a name and color. Assign it to your page for easy filtering.",
            },
            {
              title: "Mark a page as favorite",
              description:
                "Click the star icon on any page to add it to your Favorites list in the sidebar for quick access.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Key Concepts">
        <p>
          Knowledge is built around a few core concepts that keep your content
          organized and accessible:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Pages</strong> &mdash; Rich
            content documents with a full-featured editor supporting headings,
            lists, code blocks, images, and more.
          </li>
          <li>
            <strong className="text-foreground">Categories</strong> &mdash;
            Color-coded labels that group related pages together and make
            filtering simple.
          </li>
          <li>
            <strong className="text-foreground">Templates</strong> &mdash;
            Reusable page structures you can create once and apply whenever you
            need a consistent format.
          </li>
          <li>
            <strong className="text-foreground">Whiteboards</strong> &mdash;
            Visual collaboration canvases powered by Excalidraw for diagrams,
            brainstorming, and sketches.
          </li>
          <li>
            <strong className="text-foreground">Favorites</strong> &mdash;
            Starred pages that appear in your sidebar for instant access to
            frequently referenced content.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Navigating the Sidebar">
        <p>
          The Knowledge sidebar gives you quick access to all your content. At
          the top you&apos;ll find your Favorites, followed by Categories, and
          the full All Pages list. Use the search bar to jump directly to any
          page by title or content.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Start Small">
        You don&apos;t need to document everything at once. Begin with three to
        five key SOPs or processes your team references most often, then expand
        from there as documentation becomes a habit.
      </Callout>

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
          {
            title: "Search & Favorites",
            href: "/learn/knowledge/search",
            description: "Find pages and save favorites.",
          },
        ]}
      />
    </article>
  )
}
