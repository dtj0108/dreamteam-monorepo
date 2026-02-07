import {
  ArticleHeader,
  ArticleSection,
  Callout,
  StepList,
  RelatedArticles,
} from "@/components/learn"

export default function LearnTeamMeetingsPage() {
  return (
    <article>
      <ArticleHeader
        title="Meetings & Calls"
        description="Start audio and video calls directly from channels and direct messages on dreamteam.ai."
        readTime="6 min read"
      />

      <ArticleSection title="What Are Meetings?">
        <p>
          Meetings in Team let you start voice and video calls without leaving your
          workspace. Whether you need a quick sync with one person or a group discussion
          with an entire channel, you can launch a call directly from any conversation.
        </p>
        <p>
          Calls integrate seamlessly with your channels and DMs. When a call is active,
          other members of the conversation can see it and join with a single click.
        </p>
      </ArticleSection>

      <ArticleSection title="Starting a Call">
        <p>Launch a call from any channel or direct message.</p>
        <StepList
          steps={[
            {
              title: "Open a channel or direct message",
              description:
                "Navigate to the conversation where you want to start a call. Calls can be started from both channels and DMs.",
            },
            {
              title: "Click the call button",
              description:
                "Click the phone or video icon in the top-right corner of the conversation header. Choose audio-only or video depending on your preference.",
            },
            {
              title: "Invite participants",
              description:
                "For channel calls, all channel members will be notified. For DMs, the other person receives a call notification immediately.",
            },
            {
              title: "Wait for others to join",
              description:
                "Participants click the Join Call button in the conversation to enter the meeting. You will see them appear in the call view as they connect.",
            },
          ]}
        />
      </ArticleSection>

      <ArticleSection title="Meeting View">
        <p>
          Once a call is active, the meeting view takes over your conversation panel. You
          will see video feeds from participants arranged in a grid layout, with the active
          speaker highlighted. If participants have their cameras off, their avatar and
          name are displayed instead.
        </p>
        <p>
          The chat for the conversation remains accessible during the call, so you can
          share links, files, or notes without interrupting the discussion.
        </p>
      </ArticleSection>

      <ArticleSection title="Audio and Video Controls">
        <p>
          The call toolbar at the bottom of the meeting view gives you quick access to
          essential controls. Toggle your microphone on and off with the mute button.
          Turn your camera on or off with the video toggle. Use the screen share button
          to present your screen to other participants.
        </p>
        <p>
          Click the red End Call button to leave the meeting. If you are the last person
          in the call, it ends automatically.
        </p>
      </ArticleSection>

      <Callout type="info" title="Calls work everywhere">
        You can start and join calls from both channels and direct messages. Channel
        calls are great for team standups or group brainstorming, while DM calls are
        perfect for quick one-on-one syncs.
      </Callout>

      <ArticleSection title="Best Practices">
        <p>
          For scheduled meetings, post a message in the channel beforehand so participants
          know when to expect the call. For impromptu discussions, simply start the call
          and let the notification bring people in.
        </p>
        <p>
          Keep your microphone muted when you are not speaking to reduce background noise.
          Use screen sharing to walk through documents or demos instead of describing them
          verbally.
        </p>
      </ArticleSection>

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
