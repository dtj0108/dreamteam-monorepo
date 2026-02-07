import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamFilesPage() {
  return (
    <article>
      <ArticleHeader
        title="File Sharing"
        description="Share files in conversations and browse all shared attachments in one place on dreamteam.ai."
        readTime="5 min read"
      />

      <ArticleSection title="What Is File Sharing?">
        <p>
          File sharing in Team lets you attach documents, images, and other files directly
          to messages in channels and direct messages. Every file you share is automatically
          indexed and accessible from the central Files page, so nothing gets lost in a
          long conversation.
        </p>
        <p>
          Supported file types include images, PDFs, documents, spreadsheets, and more.
          Files are stored securely and available to anyone who has access to the
          conversation where they were shared.
        </p>
      </ArticleSection>

      <ArticleSection title="Attaching Files to Messages">
        <p>Share files with your team in any conversation.</p>
        <StepList
          steps={[
            {
              title: "Open a channel or direct message",
              description:
                "Navigate to the conversation where you want to share a file.",
            },
            {
              title: "Click the attachment icon",
              description:
                "Click the paperclip icon in the message composer to open the file picker. You can also drag and drop files directly into the composer.",
            },
            {
              title: "Select your file",
              description:
                "Choose one or more files from your computer. A preview will appear in the composer before you send.",
            },
            {
              title: "Add a message and send",
              description:
                "Optionally type a message to accompany the file, then press Enter to send. The file will be uploaded and shared with the conversation.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Image Lightbox">
        <p>
          When someone shares an image in a conversation, a thumbnail preview appears
          inline with the message. Click the thumbnail to open the image in a full-screen
          lightbox where you can zoom in and view it at full resolution.
        </p>
        <p>
          The lightbox supports navigating between multiple images shared in the same
          conversation, so you can browse through a set of screenshots or design mockups
          without leaving the viewer.
        </p>
      </ArticleSection>

      <ArticleSection title="The Files Page">
        <p>
          The Files page collects every file shared across all your channels and direct
          messages into a single browsable view. Access it from the Team section in the
          sidebar by clicking Files.
        </p>
        <p>
          Each file entry shows the file name, who shared it, when it was shared, and
          which conversation it came from. Click any file to download it or open a preview.
        </p>
      </ArticleSection>

      <ArticleSection title="Filtering and Browsing">
        <p>
          Use the filter controls on the Files page to narrow down results by file type,
          date range, or the conversation where the file was shared. This is especially
          useful when you know roughly when a file was shared but cannot remember the
          exact channel.
        </p>
        <p>
          You can also use the search bar to find files by name. Combined with filters,
          search makes it easy to locate any attachment in seconds.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Find shared documents fast">
        Use the Files page to quickly locate documents shared weeks ago. Instead of
        scrolling through message history, go to Files, filter by file type, and search
        by name to find exactly what you need.
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
