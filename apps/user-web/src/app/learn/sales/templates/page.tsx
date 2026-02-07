import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesTemplatesPage() {
  return (
    <article>
      <ArticleHeader
        title="Email & SMS Templates"
        description="Create reusable email and SMS templates with dynamic tags that automatically personalize your outreach at scale."
        readTime="7 min read"
      />

      <ArticleSection title="What Are Templates?">
        <p>
          Templates are pre-written messages that you can reuse across your sales
          outreach. Instead of typing the same introduction email for every new lead,
          create a template once and use it whenever you need it. Templates support
          dynamic tags that automatically fill in details like the recipient&apos;s
          name and company.
        </p>
        <p>
          DreamTeam supports both email templates (with HTML formatting, subject
          lines, and CC/BCC) and SMS templates (plain text messages).
        </p>
      </ArticleSection>

      <ArticleSection title="Template Tags">
        <p>
          Template tags are placeholders that get replaced with real data when the
          message is sent. Wrap them in double curly braces:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ contact.first_name }}"}</code> and{" "}
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ contact.last_name }}"}</code> &mdash;
            The recipient&apos;s name
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ lead.display_name }}"}</code> &mdash;
            The lead&apos;s company name
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ user.first_name }}"}</code> and{" "}
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ user.last_name }}"}</code> &mdash;
            Your name (the sender)
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ user.email }}"}</code> and{" "}
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ user.phone }}"}</code> &mdash;
            Your contact details
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{"{{ organization.name }}"}</code> &mdash;
            Your organization&apos;s name
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Creating an Email Template">
        <StepList
          steps={[
            {
              title: "Name your template",
              description:
                "Give it a descriptive name like \"Cold Outreach - Initial\" or \"Post-Demo Follow-Up\" so your team can find it easily.",
            },
            {
              title: "Write the subject line",
              description:
                "Craft a compelling subject. You can use template tags here too, e.g., \"{{ contact.first_name }}, quick question about {{ lead.display_name }}\".",
            },
            {
              title: "Compose the HTML body",
              description:
                "Write your email content with HTML formatting. Use template tags to personalize the greeting, references to the company, and your signature.",
            },
            {
              title: "Choose shared or private",
              description:
                "Private templates are only visible to you. Shared templates are available to your entire team and can be used in workflows.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Creating an SMS Template">
        <p>
          SMS templates work the same way as email templates but use plain text
          instead of HTML. Give the template a name and write the message body with
          any template tags you need. Keep SMS messages concise &mdash; under 160
          characters is ideal for deliverability.
        </p>
      </ArticleSection>

      <Callout type="tip" title="Share Templates for Team Consistency">
        Mark your best-performing templates as shared so your entire team uses the
        same proven messaging. Shared templates are also required for use in
        workflow sequences &mdash; private templates cannot be added to workflows.
      </Callout>

      <ArticleSection title="Shared vs Private">
        <p>
          Private templates are personal &mdash; only you can see and use them.
          They&apos;re great for drafts or messages specific to your style. Shared
          templates are visible to everyone in your organization and can be used in
          automated workflows. When you find a template that performs well, promote
          it from private to shared so the whole team benefits.
        </p>
      </ArticleSection>

      <ArticleSection title="Using Templates in Workflows">
        <p>
          Workflow email and SMS steps reference shared templates by ID. When the
          workflow executes a step, it pulls the latest version of the template and
          fills in the tags for each enrolled lead. This means you can update a
          template&apos;s content and every active workflow using it will automatically
          send the updated version.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Workflows & Automation",
            href: "/learn/sales/workflows",
            description: "Build multi-step outreach sequences.",
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
