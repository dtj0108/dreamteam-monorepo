import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamGettingStartedPage() {
  return (
    <article>
      <ArticleHeader
        title="Getting Started with Team"
        description="Set up your communication workspace, explore channels, and send your first message on dreamteam.ai."
        readTime="5 min read"
      />

      <ArticleSection title="Welcome to Team">
        <p>
          Team is your central hub for real-time communication on dreamteam.ai. It brings
          together channels, direct messages, file sharing, and meetings into a single
          workspace so your team can collaborate without switching between tools.
        </p>
        <p>
          Whether you&apos;re coordinating on a project, sharing updates, or having a quick
          one-on-one conversation, Team gives you the right tool for every interaction.
        </p>
      </ArticleSection>

      <ArticleSection title="Your First Steps">
        <p>Follow these steps to get up and running with Team in just a few minutes.</p>
        <StepList
          steps={[
            {
              title: "Open Team from the sidebar",
              description:
                "Click the Team icon in the left sidebar to open the Team workspace. You will see the channel list and recent activity.",
            },
            {
              title: "Browse existing channels",
              description:
                "Scroll through the channel list to see what conversations are already happening. Click any channel name to read its messages.",
            },
            {
              title: "Create a channel",
              description:
                "Click the + button next to Channels in the sidebar to create a new public or private channel. Give it a clear name and description.",
            },
            {
              title: "Send your first message",
              description:
                "Open any channel, type your message in the composer at the bottom, and press Enter to send. You can also attach files or add formatting.",
            },
            {
              title: "Start a direct message",
              description:
                "Click the + button next to Direct Messages in the sidebar, select a teammate, and start a private conversation.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Key Concepts">
        <p>
          <strong>Channels</strong> are shared spaces for team-wide or topic-specific
          conversations. They can be public (anyone can join) or private (invite-only).
        </p>
        <p>
          <strong>Direct Messages</strong> are private one-on-one conversations between you
          and a teammate. Use them for quick questions or personal coordination.
        </p>
        <p>
          <strong>Threads</strong> let you reply to a specific message within a channel,
          keeping side discussions organized without cluttering the main conversation.
        </p>
        <p>
          <strong>Files</strong> shared in any channel or DM are automatically collected on
          the Files page, making it easy to find attachments later.
        </p>
        <p>
          <strong>@Mentions</strong> notify specific teammates when you need their attention.
          Type @ followed by a name to mention someone in a message.
        </p>
      </ArticleSection>

      <ArticleSection title="Understanding the Sidebar">
        <p>
          The Team sidebar is your navigation home. At the top you&apos;ll find pinned and
          recent channels. Below that, your direct message conversations appear sorted by
          most recent activity. Use the search bar at the top of the sidebar to quickly
          find any channel or teammate.
        </p>
        <p>
          Unread indicators appear as badges next to channels and DMs that have new messages
          you haven&apos;t seen yet, so you always know where to catch up.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Organize with channels">
        Create topic-specific channels like #design-feedback or #weekly-updates to keep
        conversations focused. A well-organized channel structure helps your team find
        the right place to post and reduces noise.
      </Callout>

      <RelatedArticles
        articles={[
          {
            title: "Channels",
            href: "/learn/team/channels",
            description: "Create and manage public and private channels.",
          },
          {
            title: "Direct Messages",
            href: "/learn/team/direct-messages",
            description: "Start private conversations with teammates.",
          },
          {
            title: "File Sharing",
            href: "/learn/team/files",
            description: "Share and browse files across conversations.",
          },
        ]}
      />
    </article>
  )
}
