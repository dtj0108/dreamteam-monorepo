import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgePagesPage() {
  return (
    <article>
      <ArticleHeader
        title="Pages & Editor"
        description="Create rich content pages with a full-featured editor to document everything your team needs."
        readTime="7 min read"
      />

      <ArticleSection title="What Are Pages?">
        <p>
          Pages are the core building blocks of your knowledge base in
          dreamteam.ai. Each page is a rich document that can contain formatted
          text, headings, lists, code blocks, images, and embedded media. Pages
          live in your workspace and are visible to all team members.
        </p>
        <p>
          Every page tracks who created it and when it was last edited, giving
          your team full visibility into documentation ownership and freshness.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Page">
        <p>
          Follow these steps to create your first knowledge page.
        </p>
        <StepList
          steps={[
            {
              title: "Click New Page",
              description:
                "From the Knowledge section in the sidebar, click the New Page button in the top-right corner of the All Pages view.",
            },
            {
              title: "Enter a title",
              description:
                "Give your page a clear, descriptive title. This is what teammates will see when browsing or searching.",
            },
            {
              title: "Write your content",
              description:
                "Use the rich editor to add formatted text, headings, bullet lists, code blocks, images, and more.",
            },
            {
              title: "Set a parent page (optional)",
              description:
                "If this page belongs under another page, select a parent to create a hierarchical structure.",
            },
            {
              title: "Save your page",
              description:
                "Click Save to publish the page. It will immediately be visible to your entire workspace.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Rich Content Editor">
        <p>
          The page editor supports a wide range of formatting options to help you
          create clear, structured documentation:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Text formatting</strong> &mdash;
            Bold, italic, underline, strikethrough, and inline code.
          </li>
          <li>
            <strong className="text-foreground">Headings</strong> &mdash;
            Multiple heading levels to organize content into scannable sections.
          </li>
          <li>
            <strong className="text-foreground">Lists</strong> &mdash; Bullet
            lists, numbered lists, and checklists for step-by-step processes.
          </li>
          <li>
            <strong className="text-foreground">Code blocks</strong> &mdash;
            Syntax-highlighted code snippets for technical documentation.
          </li>
          <li>
            <strong className="text-foreground">Media</strong> &mdash; Embed
            images, files, and links directly in your content.
          </li>
        </ul>
      </ArticleSection>

      <Callout type="tip" title="Use Page Hierarchy">
        Organize related pages using parent-child relationships. For example,
        create a top-level &quot;Engineering&quot; page with child pages for
        &quot;Deployment Process&quot;, &quot;Code Review Guidelines&quot;, and
        &quot;Architecture Decisions&quot;.
      </Callout>

      <ArticleSection title="Page Hierarchy">
        <p>
          Pages can be nested under other pages to create a tree structure. This
          is useful for grouping related content, such as placing all
          onboarding documents under a single parent page. Child pages appear
          indented beneath their parent in the sidebar and All Pages view.
        </p>
      </ArticleSection>

      <ArticleSection title="Creator and Editor Tracking">
        <p>
          Every page displays the name of the team member who created it and the
          date it was last modified. This makes it easy to identify the owner of
          a document and understand how recently it was updated. If content looks
          stale, you can reach out to the original creator or update it yourself.
        </p>
      </ArticleSection>

      <ArticleSection title="Archive and Restore">
        <p>
          When a page is no longer relevant, you can archive it instead of
          deleting it permanently. Archived pages are hidden from the default
          view but can be restored at any time if you need them again. This keeps
          your knowledge base clean without losing historical documentation.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Categories & Organization",
            href: "/learn/knowledge/categories",
            description: "Organize pages with color-coded categories.",
          },
          {
            title: "Templates",
            href: "/learn/knowledge/templates",
            description: "Build reusable page templates for consistent formatting.",
          },
        ]}
      />
    </article>
  )
}
