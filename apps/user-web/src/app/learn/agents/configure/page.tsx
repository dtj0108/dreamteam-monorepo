import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnAgentsConfigurePage() {
  return (
    <article>
      <ArticleHeader
        title="Configuring Agents"
        description="Customize how your agents communicate and behave by adjusting style presets, custom instructions, notifications, and reporting structure."
        readTime="7 min read"
      />

      <ArticleSection title="What Is Agent Configuration?">
        <p>
          Every agent you hire can be configured to match your team&apos;s
          preferences. The configuration page lets you control how the agent
          writes, what additional context it follows, who it reports to, and
          how it notifies you about completed work. Access an agent&apos;s
          configuration by navigating to the Configure page from the agent
          list.
        </p>
      </ArticleSection>

      <ArticleSection title="Style Presets">
        <p>
          Style presets control the tone and verbosity of an agent&apos;s output.
          You can choose from several options to match how you want the agent
          to communicate:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Verbosity level</strong> — Set whether the agent gives concise
            bullet-point answers or detailed, long-form explanations.
          </li>
          <li>
            <strong>Tone</strong> — Choose between formal, conversational, or
            technical styles depending on the audience.
          </li>
          <li>
            <strong>Example usage</strong> — Some presets include sample outputs so
            you can preview how the agent will respond before saving.
          </li>
        </ul>
      </ArticleSection>

      <ArticleSection title="Custom Instructions">
        <p>
          Custom instructions let you give an agent specific guidance that applies
          to every interaction. This is useful for setting expectations, providing
          recurring context, or defining boundaries.
        </p>
        <StepList
          steps={[
            {
              title: "Open the agent configuration page",
              description:
                "Navigate to the Configure page for the agent you want to customize.",
            },
            {
              title: "Write custom instructions",
              description:
                "Enter free-form text describing how the agent should behave, what to prioritize, or what to avoid.",
            },
            {
              title: "Save your changes",
              description:
                "Click Save to apply the instructions. They will take effect in the agent\u2019s next interaction.",
            },
          ]}
        />
      </ArticleSection>

      <Callout type="tip" title="Be Specific">
        The more specific your custom instructions, the better the agent performs.
        Instead of saying &quot;be helpful,&quot; try &quot;always include a
        one-sentence summary at the top of each response&quot; or &quot;use
        metric units for all measurements.&quot;
      </Callout>

      <ArticleSection title="Notification Settings">
        <p>
          Configure how and when you receive notifications about agent activity.
          You can enable notifications for completed schedule runs, approval
          requests, or error alerts. Notification preferences are set per agent,
          so you can have different settings for different roles.
        </p>
      </ArticleSection>

      <ArticleSection title="Reports-To">
        <p>
          The Reports-To setting assigns an agent to a specific team member as
          its primary owner. This person receives priority notifications, appears
          as the agent&apos;s manager in the workspace, and is the default
          reviewer for approval requests. You can reassign the Reports-To
          contact at any time from the configuration page.
        </p>
      </ArticleSection>

      <RelatedArticles
        articles={[
          {
            title: "Agent Chat",
            href: "/learn/agents/chat",
            description: "Interact with agents through the chat interface.",
          },
          {
            title: "Autonomy & Business Context",
            href: "/learn/agents/autonomy",
            description: "Provide context that shapes agent behavior.",
          },
        ]}
      />
    </article>
  )
}
