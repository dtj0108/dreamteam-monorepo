import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function KnowledgeWhiteboardsPage() {
  return (
    <article>
      <ArticleHeader
        title="Whiteboards"
        description="Collaborate visually with an interactive drawing canvas for diagrams, brainstorming, and sketches."
        readTime="5 min read"
      />

      <ArticleSection title="What Are Whiteboards?">
        <p>
          Whiteboards in dreamteam.ai are visual collaboration canvases that sit
          alongside your knowledge pages. They are perfect for content that is
          better expressed visually &mdash; architecture diagrams, user flows,
          brainstorming sessions, org charts, and quick sketches.
        </p>
        <p>
          Each whiteboard is stored in your knowledge base just like a page, so
          it is searchable, categorizable, and always available to your team.
        </p>
      </ArticleSection>

      <ArticleSection title="Excalidraw-Based Editor">
        <p>
          Whiteboards are powered by Excalidraw, an open-source drawing library
          known for its hand-drawn, approachable style. The editor runs directly
          in your browser with no plugins or downloads required. It supports
          real-time collaboration, so multiple team members can draw on the same
          canvas simultaneously.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Whiteboard">
        <StepList
          steps={[
            {
              title: "Click New Whiteboard",
              description:
                "From the Knowledge section, click the New Whiteboard button to create a blank canvas.",
            },
            {
              title: "Name your whiteboard",
              description:
                "Give it a descriptive name like \"Q1 Architecture Overview\" or \"Onboarding Flow Diagram\" so teammates can find it.",
            },
            {
              title: "Use the drawing tools",
              description:
                "Select shapes, text, arrows, or freehand drawing from the toolbar to start building your visual content.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Drawing Tools">
        <p>
          The whiteboard toolbar gives you access to a full set of drawing
          primitives:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Shapes</strong> &mdash;
            Rectangles, ellipses, diamonds, and more for building diagrams and
            flowcharts.
          </li>
          <li>
            <strong className="text-foreground">Text</strong> &mdash; Add labels,
            annotations, and descriptions directly on the canvas.
          </li>
          <li>
            <strong className="text-foreground">Arrows and lines</strong> &mdash;
            Connect shapes to show relationships, data flows, and sequences.
          </li>
          <li>
            <strong className="text-foreground">Freehand drawing</strong> &mdash;
            Sketch freely for quick ideas, annotations, or informal diagrams.
          </li>
        </ul>
      </ArticleSection>

      <Callout type="info" title="Powered by Excalidraw">
        Whiteboards use the Excalidraw library, which means you get features
        like infinite canvas, zoom and pan, shape grouping, and export to PNG
        or SVG &mdash; all built into dreamteam.ai with no extra setup.
      </Callout>

      <ArticleSection title="Collaboration Features">
        <p>
          Whiteboards support real-time collaboration. When multiple team members
          open the same whiteboard, they can see each other&apos;s cursors and
          changes as they happen. This makes whiteboards ideal for live
          brainstorming sessions, design reviews, and collaborative planning
          meetings.
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
            description: "Find whiteboards and pages with search.",
          },
        ]}
      />
    </article>
  )
}
