import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamSearchPage() {
  return (
    <article>
      <ArticleHeader
        title="Search & Mentions"
        description="Find messages across all conversations and track @mentions to stay on top of what matters on dreamteam.ai."
        readTime="5 min read"
      />

      <ArticleSection title="What Is Search?">
        <p>
          Search lets you find any message, file, or conversation across your entire Team
          workspace. Instead of scrolling through channels to find something someone said
          last week, type a few keywords and get instant results from every channel and
          DM you have access to.
        </p>
        <p>
          Search results are ranked by relevance and recency, so the most useful matches
          appear first. Each result shows the message content, who sent it, when, and in
          which channel or DM.
        </p>
      </ArticleSection>

      <ArticleSection title="Using the Search Page">
        <p>Find the information you need in a few steps.</p>
        <StepList
          steps={[
            {
              title: "Click the search icon",
              description:
                "Click the magnifying glass icon in the Team sidebar or use the keyboard shortcut to open the search panel.",
            },
            {
              title: "Enter your query",
              description:
                "Type keywords, phrases, or a teammate's name to search across all messages and files in your workspace.",
            },
            {
              title: "Filter results",
              description:
                "Narrow results by channel, person, date range, or file type using the filter options. This helps you find exactly what you are looking for.",
            },
            {
              title: "Click a result to jump to the message",
              description:
                "Click any search result to navigate directly to that message in its original conversation, with full context visible.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="@Mentions">
        <p>
          @Mentions let you notify specific teammates when you need their attention. Type
          the @ symbol followed by a name in any message, and that person will receive a
          notification highlighting your message.
        </p>
        <p>
          You can mention anyone in the workspace. In channels, mentioning someone who is
          not a member will still send them a notification, making it easy to pull people
          into relevant discussions.
        </p>
      </ArticleSection>

      <ArticleSection title="The Mentions Page">
        <p>
          The Mentions page collects every message where you have been @mentioned into a
          single view. Access it from the Team sidebar to see a chronological list of all
          mentions across channels and DMs.
        </p>
        <p>
          Each entry shows the message content, who mentioned you, and the conversation
          it came from. Click any mention to jump directly to the original message with
          full context. Unread mentions are highlighted so you can quickly catch up on
          what needs your attention.
        </p>
      </ArticleSection>

      <ArticleSection title="Autocomplete Suggestions">
        <p>
          When you type @ in the message composer, an autocomplete dropdown appears with
          a list of workspace members. The list narrows as you continue typing, making it
          fast to find the right person. Select a suggestion by clicking it or pressing
          Enter.
        </p>
        <p>
          Autocomplete also works for channel names when you type #, letting you
          cross-reference other channels in your messages. Recipients can click the
          channel link to navigate directly to that conversation.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Get someone&apos;s attention">
        Use @mentions sparingly and intentionally. When you @mention a teammate, they
        receive a notification, so reserve it for messages that genuinely need their
        input. For general FYI messages, post in the channel without a mention.
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
        ]}
      />
    </article>
  )
}
