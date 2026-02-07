import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesInboxPage() {
  return (
    <article>
      <ArticleHeader
        title="Inbox & Conversations"
        description="Manage all your email and SMS conversations from a unified inbox. View threads, send replies, and keep every interaction linked to the right lead."
        readTime="5 min read"
      />

      <ArticleSection title="What Is the Inbox?">
        <p>
          The DreamTeam inbox gives you a single place to view and respond to all
          your sales conversations. Emails and SMS messages are automatically linked
          to the correct lead and contact, so you always have full context when
          replying.
        </p>
        <p>
          The inbox shows conversations across your entire team, making it easy to
          see what&apos;s been communicated and avoid duplicate outreach.
        </p>
      </ArticleSection>

      <ArticleSection title="Viewing Conversations">
        <p>
          Open the inbox from the Sales sidebar to see your recent conversations
          sorted by date. Each conversation shows the contact name, lead, subject
          line, and a preview of the latest message. Click into any thread to see
          the full history and send a reply.
        </p>
        <p>
          You can filter conversations by type (email, SMS), by user, or by lead to
          quickly find what you&apos;re looking for.
        </p>
      </ArticleSection>

      <ArticleSection title="Sending an Email">
        <StepList
          steps={[
            {
              title: "Open a lead or contact",
              description:
                "Navigate to the lead and select the contact you want to email.",
            },
            {
              title: "Click the email action",
              description:
                "Use the email button to open the compose window. Select a template or write from scratch.",
            },
            {
              title: "Write your message",
              description:
                "Compose your email with a subject line and body. Use template tags to personalize content automatically.",
            },
            {
              title: "Add CC or BCC recipients",
              description:
                "Optionally add other team members or external addresses to the CC or BCC fields.",
            },
            {
              title: "Send",
              description:
                "Click send to deliver the email. It will be logged automatically in the lead&apos;s activity feed.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Use Templates for Faster Replies">
        Instead of typing the same response over and over, create email templates
        with dynamic tags. Select a template when composing and the tags will
        auto-fill with the contact&apos;s name, company, and other details.
      </Callout>

      <ArticleSection title="Sending SMS">
        <p>
          Send text messages directly from DreamTeam to contacts with mobile phone
          numbers. SMS messages are logged in the activity feed just like emails, so
          your team always sees the full conversation history regardless of channel.
        </p>
        <p>
          You can also use SMS templates for common messages like meeting
          confirmations or quick follow-ups.
        </p>
      </ArticleSection>

      <ArticleSection title="Calendar Integration">
        <p>
          Schedule meetings with leads and contacts using scheduling links. Insert a
          scheduling link into your email template and the recipient can pick a time
          that works for both of you. Meetings are automatically logged as activities
          on the lead.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Email & SMS Templates",
            href: "/learn/sales/templates",
            description: "Create reusable templates with dynamic tags.",
          },
          {
            title: "Contacts & Communication",
            href: "/learn/sales/contacts",
            description: "Manage contacts and their communication details.",
          },
        ]}
      />
    </article>
  )
}
