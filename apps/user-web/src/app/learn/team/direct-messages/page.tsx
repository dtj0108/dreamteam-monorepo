import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamDirectMessagesPage() {
  return (
    <article>
      <ArticleHeader
        title="Direct Messages"
        description="Start private one-on-one conversations with teammates on dreamteam.ai."
        readTime="4 min read"
      />

      <ArticleSection title="What Are Direct Messages?">
        <p>
          Direct messages (DMs) are private conversations between you and one other
          teammate. Unlike channels, DMs are not visible to anyone else in the workspace.
          They are ideal for quick questions, personal coordination, or sensitive
          discussions that don&apos;t need a wider audience.
        </p>
        <p>
          Your DM conversations appear in the sidebar under the Direct Messages section,
          sorted by most recent activity so the people you talk to most are always easy
          to find.
        </p>
      </ArticleSection>

      <ArticleSection title="Starting a Direct Message">
        <p>Begin a conversation with any teammate in just a few steps.</p>
        <StepList
          steps={[
            {
              title: "Open the Direct Messages section",
              description:
                "In the Team sidebar, find the Direct Messages section. Click the + icon to start a new conversation.",
            },
            {
              title: "Select a teammate",
              description:
                "Search for or scroll through the list of workspace members. Click on the person you want to message.",
            },
            {
              title: "Send your message",
              description:
                "Type your message in the composer at the bottom and press Enter. Your conversation will now appear in the DM list for easy access.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Unread Indicators">
        <p>
          When a teammate sends you a new message, an unread badge appears next to their
          name in the sidebar. Bold text indicates conversations with unread messages, so
          you can quickly scan for anything that needs your attention.
        </p>
        <p>
          The unread count clears automatically when you open the conversation and view
          the new messages. You can also mark a conversation as read from the sidebar
          without opening it.
        </p>
      </ArticleSection>

      <ArticleSection title="Rich Messaging Features">
        <p>
          Direct messages support the same rich features available in channels. You can
          format text with bold, italic, and code blocks to make your messages clearer.
          Attach files by clicking the paperclip icon or dragging files into the composer.
        </p>
        <p>
          Add emoji reactions to acknowledge messages without sending a separate reply.
          Share links that automatically preview with a title and description. Everything
          you share in a DM is also accessible from the Files page.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Quick coordination">
        Use DMs for fast, informal check-ins that don&apos;t need channel visibility.
        If a discussion grows into something the broader team should see, you can always
        move the conversation to a relevant channel.
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Channels",
            href: "/learn/team/channels",
            description: "Create and manage public and private channels.",
          },
          {
            title: "Meetings & Calls",
            href: "/learn/team/meetings",
            description: "Start calls from channels and direct messages.",
          },
        ]}
      />
    </article>
  )
}
