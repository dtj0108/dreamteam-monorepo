import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamChannelsPage() {
  return (
    <article>
      <ArticleHeader
        title="Channels"
        description="Create and manage public and private channels to organize your team&apos;s conversations on dreamteam.ai."
        readTime="7 min read"
      />

      <ArticleSection title="What Are Channels?">
        <p>
          Channels are shared conversation spaces where your team discusses topics, shares
          updates, and collaborates in real time. Every channel has a name, an optional
          description, and a list of members who can read and post messages.
        </p>
        <p>
          Think of channels as dedicated rooms for specific subjects. Instead of sending
          messages to individual people, post in a channel so everyone who needs the
          information can see it.
        </p>
      </ArticleSection>

      <ArticleSection title="Public vs Private Channels">
        <p>
          <strong>Public channels</strong> are visible to everyone in your workspace. Any
          team member can browse, join, and start participating immediately. Use public
          channels for company-wide announcements, general discussion, or open
          collaboration.
        </p>
        <p>
          <strong>Private channels</strong> are invite-only. Only members who have been
          added can see the channel in their sidebar or read its messages. Use private
          channels for sensitive topics, leadership discussions, or small working groups.
        </p>
      </ArticleSection>

      <ArticleSection title="Creating a Channel">
        <p>Setting up a new channel takes just a few clicks.</p>
        <StepList
          steps={[
            {
              title: "Click the + button next to Channels",
              description:
                "In the Team sidebar, find the Channels section and click the + icon to open the channel creation dialog.",
            },
            {
              title: "Name your channel",
              description:
                "Choose a clear, descriptive name. Use lowercase and hyphens for readability, like #product-launches or #engineering-standup.",
            },
            {
              title: "Set visibility",
              description:
                "Choose Public to let anyone join, or Private to restrict access to invited members only.",
            },
            {
              title: "Invite members",
              description:
                "Add teammates who should be part of the channel. For public channels, others can join on their own later.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Channel naming conventions">
        Use consistent prefixes to keep channels organized. For example, use #team- for
        team-specific channels, #project- for project discussions, and #announce- for
        announcement-only channels. This makes it easier to find the right channel quickly.
      </Callout>

      <ArticleSection title="Real-time Messaging">
        <p>
          Messages in channels appear instantly for all members. Type in the composer at
          the bottom of the channel view and press Enter to send. You can format text with
          bold, italic, and code blocks, and attach files directly to your messages.
        </p>
        <p>
          Reactions let you respond to messages without adding to the conversation. Click
          the emoji button on any message to add a quick reaction like a thumbs up or
          checkmark.
        </p>
      </ArticleSection>

      <ArticleSection title="Threads">
        <p>
          Threads keep side discussions organized within a channel. Click the reply icon on
          any message to open a thread. Replies appear in a dedicated panel without
          cluttering the main channel view.
        </p>
        <p>
          Use threads for follow-up questions, detailed discussions, or feedback on a
          specific message. Other channel members can see that a thread exists and choose
          to follow along.
        </p>
      </ArticleSection>

      <ArticleSection title="Managing Members">
        <p>
          Channel creators and workspace admins can manage channel membership. Open the
          channel settings by clicking the channel name at the top of the conversation
          view. From there you can add or remove members, update the channel description,
          or archive the channel when it is no longer needed.
        </p>
        <p>
          For public channels, any team member can join or leave at any time. For private
          channels, only existing members or admins can invite new people.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
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
