import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function SalesContactsPage() {
  return (
    <article>
      <ArticleHeader
        title="Contacts & Communication"
        description="Add contacts to your leads, manage their communication details, and keep a complete history of every interaction."
        readTime="5 min read"
      />

      <ArticleSection title="What Are Contacts?">
        <p>
          A contact is a person associated with a lead. While a lead represents the
          company or organization, contacts are the individuals you communicate with
          &mdash; decision makers, champions, gatekeepers, and end users.
        </p>
        <p>
          Each lead can have multiple contacts, and each contact can have multiple
          email addresses, phone numbers, and URLs. This flexibility lets you capture
          every way to reach a person.
        </p>
      </ArticleSection>

      <ArticleSection title="Adding a Contact to a Lead">
        <StepList
          steps={[
            {
              title: "Open the lead detail view",
              description:
                "Click on any lead in your list to open its detail page.",
            },
            {
              title: "Click \"Add Contact\"",
              description:
                "Find the contacts section on the lead page and click the add button.",
            },
            {
              title: "Enter contact details",
              description:
                "Fill in the contact&apos;s name and job title. Both fields are optional but recommended.",
            },
            {
              title: "Add communication methods",
              description:
                "Add email addresses, phone numbers, and URLs. Select a type for each (office, mobile, home, direct, fax, or other).",
            },
            {
              title: "Save the contact",
              description:
                "Click save to attach the contact to the lead. They&apos;ll appear in the contacts section immediately.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Email and Phone Types">
        <p>
          Each email address and phone number has a type label that helps your team
          understand how to reach the contact appropriately:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Office</strong> &mdash; Main business line or corporate email</li>
          <li><strong>Mobile</strong> &mdash; Personal cell phone</li>
          <li><strong>Home</strong> &mdash; Residential number or personal email</li>
          <li><strong>Direct</strong> &mdash; Direct dial or personal work email</li>
          <li><strong>Fax</strong> &mdash; Fax number</li>
          <li><strong>Other</strong> &mdash; Any communication method that doesn&apos;t fit the above</li>
        </ul>
      </ArticleSection>

      <Callout type="tip" title="Add Multiple Contact Methods">
        Always add at least two ways to reach a contact &mdash; typically a direct
        email and a mobile phone. This ensures you can always follow up even if one
        channel goes cold.
      </Callout>

      <ArticleSection title="Activity History">
        <p>
          Every email, call, SMS, meeting, and note involving a contact is
          automatically logged in the activity feed on the lead. This gives you a
          complete timeline of your relationship, making it easy for any team member
          to pick up where the last conversation left off.
        </p>
      </ArticleSection>

      <ArticleSection title="Managing Contact Details">
        <p>
          Update a contact&apos;s name, title, or communication details at any time
          from the lead detail view. When updating emails or phone numbers, you
          provide the full updated list &mdash; this ensures outdated information is
          replaced cleanly. You can also delete a contact entirely if they&apos;re no
          longer relevant to the deal.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Lead Management",
            href: "/learn/sales/leads",
            description: "Create, organize, and track leads with smart views.",
          },
          {
            title: "Email & SMS Templates",
            href: "/learn/sales/templates",
            description: "Create reusable templates with dynamic tags.",
          },
        ]}
      />
    </article>
  )
}
