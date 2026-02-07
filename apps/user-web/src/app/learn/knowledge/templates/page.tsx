import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgeTemplatesPage() {
  return (
    <article>
      <ArticleHeader
        title="Templates"
        description="Create reusable page templates so your team produces consistent, well-structured documentation every time."
        readTime="6 min read"
      />

      <ArticleSection title="What Are Templates?">
        <p>
          Templates in dreamteam.ai are pre-built page structures that you can
          apply when creating new knowledge pages. Instead of starting from a
          blank page every time, templates give you a ready-made outline with
          headings, sections, and placeholder text tailored to a specific
          document type.
        </p>
        <p>
          Templates save time, enforce consistency, and make it easier for team
          members to contribute documentation without worrying about formatting
          or missing sections.
        </p>
      </ArticleSection>

      <ArticleSection title="System vs Custom Templates">
        <p>
          dreamteam.ai provides a set of built-in system templates for common
          document types like meeting notes, project briefs, and SOPs. These
          templates are available to every workspace out of the box.
        </p>
        <p>
          In addition to system templates, you can create your own custom
          templates tailored to your team&apos;s specific needs. Custom templates
          are workspace-specific and can be edited or removed at any time.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Template from a Page">
        <p>
          The easiest way to create a template is to start with an existing page
          that already has the structure you want to reuse.
        </p>
        <StepList
          steps={[
            {
              title: "Open an existing page",
              description:
                "Navigate to a page that has the structure and sections you want to turn into a reusable template.",
            },
            {
              title: "Save as template",
              description:
                "Use the page menu to select the Save as Template option. This copies the page structure into a new template.",
            },
            {
              title: "Name your template",
              description:
                "Give the template a descriptive name like \"Weekly Standup Notes\" or \"Incident Report\" so teammates can find it easily.",
            },
            {
              title: "Configure the template",
              description:
                "Review the template content and adjust any placeholder text or sections. Remove content that is specific to the original page.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Templates for Recurring Documents">
        Create templates for any document type your team produces repeatedly
        &mdash; sprint retrospectives, client onboarding checklists, release
        notes, and runbooks. The upfront investment pays off every time someone
        creates a new page.
      </Callout>

      <ArticleSection title="Using a Template to Create Pages">
        <p>
          When you click New Page, you can choose to start from a template
          instead of a blank page. Select a template from the list and a new page
          will be created with the template&apos;s structure pre-filled. From
          there, simply replace the placeholder content with your actual
          information.
        </p>
      </ArticleSection>

      <ArticleSection title="Managing Templates">
        <p>
          You can view, edit, and delete your custom templates from the Templates
          section in Knowledge. System templates cannot be deleted but you can
          choose not to use them. If a template is no longer needed, removing it
          will not affect any pages that were previously created from it &mdash;
          those pages are independent once created.
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
