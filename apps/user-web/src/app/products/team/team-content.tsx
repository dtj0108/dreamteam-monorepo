"use client";

import { 
    MessageChatCircle, 
    Users01, 
    Hash02, 
    AtSign,
    File06,
    Link01,
    Bell01,
    Stars01,
    SearchLg,
    Settings01,
    VideoRecorder,
    Microphone01
} from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProductLanding, type ProductFeature, type ProductCapability } from "@/components/marketing/product-landing";
import { cx } from "@/lib/cx";

// Hero Team Preview Component
const TeamPreview = () => (
    <div className="rounded-xl bg-bg-primary p-2 shadow-2xl ring-1 ring-border-secondary md:p-3">
        {/* Fake browser chrome */}
        <div className="mb-2 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-error-400" />
            <div className="size-2.5 rounded-full bg-warning-400" />
            <div className="size-2.5 rounded-full bg-success-400" />
            <div className="ml-3 flex-1 rounded bg-bg-tertiary px-3 py-1 text-[10px] text-text-quaternary">
                app.dreamteam.ai/team
            </div>
        </div>

        <div className="flex rounded-lg bg-bg-primary">
            {/* Sidebar */}
            <div className="hidden w-40 shrink-0 border-r border-border-secondary bg-bg-secondary p-3 md:block">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500">
                        <MessageChatCircle className="size-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary">Team</p>
                        <p className="text-[10px] text-text-tertiary">Pro</p>
                    </div>
                </div>
                <p className="mb-1.5 text-[9px] font-medium uppercase text-text-quaternary">Channels</p>
                <div className="space-y-0.5">
                    {["# general", "# engineering", "# design", "# sales"].map((item, i) => (
                        <div key={item} className={cx("rounded px-2 py-1 text-[10px]", i === 0 ? "bg-bg-primary font-medium text-text-primary" : "text-text-tertiary")}>
                            {item}
                        </div>
                    ))}
                </div>
                <p className="mb-1.5 mt-3 text-[9px] font-medium uppercase text-text-quaternary">Direct Messages</p>
                <div className="space-y-0.5">
                    {["Sarah Chen", "Mike Park"].map((item) => (
                        <div key={item} className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-text-tertiary">
                            <div className="size-1.5 rounded-full bg-success-500" />
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content - Chat View */}
            <div className="flex-1 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between border-b border-border-secondary pb-2">
                    <div className="flex items-center gap-2">
                        <Hash02 className="size-4 text-text-tertiary" />
                        <p className="text-sm font-semibold text-text-primary">general</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="size-5 rounded-full bg-bg-tertiary" />
                        <div className="size-5 rounded-full bg-bg-tertiary -ml-1.5" />
                        <div className="size-5 rounded-full bg-bg-tertiary -ml-1.5" />
                        <span className="ml-1 text-[10px] text-text-tertiary">12 members</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                    {[
                        { name: "Sarah Chen", time: "10:32 AM", msg: "Just pushed the new design updates! 🎨", avatar: "SC" },
                        { name: "Mike Park", time: "10:34 AM", msg: "Looks great! The new dashboard is 🔥", avatar: "MP" },
                        { name: "Emily Davis", time: "10:35 AM", msg: "Love it! Can we ship this today?", avatar: "ED" },
                    ].map((message) => (
                        <div key={message.name + message.time} className="flex gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-semibold text-orange-600">
                                {message.avatar}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-semibold text-text-primary">{message.name}</p>
                                    <p className="text-[9px] text-text-quaternary">{message.time}</p>
                                </div>
                                <p className="text-[10px] text-text-secondary">{message.msg}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-bg-secondary p-2">
                    <span className="text-[10px] text-text-quaternary">Message #general</span>
                </div>
            </div>
        </div>
    </div>
);

// Feature mockups
const ChannelsMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Team Channels</h3>
            <Badge color="brand" type="pill" size="sm">Real-time</Badge>
        </div>
        <div className="space-y-2">
            {[
                { name: "general", members: 24, unread: 3, desc: "Company-wide announcements" },
                { name: "engineering", members: 8, unread: 12, desc: "Technical discussions" },
                { name: "design", members: 5, unread: 0, desc: "Design reviews and feedback" },
                { name: "sales", members: 6, unread: 7, desc: "Deal updates and wins" },
            ].map((channel) => (
                <div key={channel.name} className="flex items-center gap-3 rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <Hash02 className="size-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{channel.name}</p>
                            {channel.unread > 0 && (
                                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                    {channel.unread}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-text-tertiary">{channel.desc}</p>
                    </div>
                    <p className="text-xs text-text-quaternary">{channel.members} members</p>
                </div>
            ))}
        </div>
    </div>
);

const DMsMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Direct Messages</h3>
            <span className="text-xs rounded-full bg-success-100 px-2 py-1 font-medium text-success-700">3 online</span>
        </div>
        <div className="space-y-3">
            {[
                { name: "Sarah Chen", status: "online", lastMsg: "Sounds good, let's sync tomorrow!", time: "2m ago" },
                { name: "Mike Park", status: "online", lastMsg: "The API is ready for testing 🚀", time: "15m ago" },
                { name: "Emily Davis", status: "away", lastMsg: "Can you review my PR?", time: "1h ago" },
            ].map((dm) => (
                <div key={dm.name} className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex items-start gap-3">
                        <div className="relative">
                            <div className="flex size-9 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                                {dm.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className={cx(
                                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-bg-primary",
                                dm.status === "online" ? "bg-success-500" : "bg-warning-500"
                            )} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-text-primary">{dm.name}</p>
                                <p className="text-[10px] text-text-quaternary">{dm.time}</p>
                            </div>
                            <p className="text-xs text-text-tertiary">{dm.lastMsg}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const AgentsMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">AI Agents</h3>
            <span className="text-xs rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-1 font-medium text-white">Coming Soon</span>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 ring-1 ring-violet-200">
            <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <Stars01 className="size-5" />
                </div>
                <div>
                    <p className="font-semibold text-text-primary">DreamTeam Assistant</p>
                    <p className="text-xs text-text-tertiary">Your AI-powered team member</p>
                </div>
            </div>
            <div className="space-y-2">
                {[
                    "Summarize long threads instantly",
                    "Answer questions from your docs",
                    "Draft responses in your voice",
                    "Automate routine workflows",
                ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                        <div className="size-1.5 rounded-full bg-violet-500" />
                        {feature}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const features: ProductFeature[] = [
    {
        title: "Organized Team Channels",
        description: "Keep conversations organized by topic, project, or team. Public channels for transparency, private channels for sensitive discussions.",
        bullets: [
            "Create unlimited channels",
            "Public and private options",
            "Pin important messages",
            "Rich media and file sharing",
        ],
        mockup: <ChannelsMockup />,
    },
    {
        title: "Direct Messages",
        description: "Have quick 1:1 conversations or create group DMs for focused discussions. See who's online and available in real-time.",
        bullets: [
            "Real-time presence indicators",
            "Group direct messages",
            "Message reactions and threads",
            "Read receipts and typing indicators",
        ],
        mockup: <DMsMockup />,
        reverse: true,
    },
    {
        title: "AI Agents (Coming Soon)",
        description: "Supercharge your team with AI assistants. Summarize threads, answer questions from your knowledge base, and automate routine tasks.",
        bullets: [
            "Instant thread summaries",
            "Knowledge base Q&A",
            "Smart response drafting",
            "Workflow automation",
        ],
        mockup: <AgentsMockup />,
    },
];

const capabilities: ProductCapability[] = [
    { name: "Channels", icon: Hash02, description: "Topic-based chat" },
    { name: "Direct Messages", icon: AtSign, description: "Private conversations" },
    { name: "File Sharing", icon: File06, description: "Share any file" },
    { name: "Threads", icon: MessageChatCircle, description: "Organized replies" },
    { name: "Mentions", icon: Bell01, description: "Get notified" },
    { name: "Search", icon: SearchLg, description: "Find anything" },
    { name: "Video Calls", icon: VideoRecorder, description: "Face-to-face" },
    { name: "Voice", icon: Microphone01, description: "Huddles" },
];

export function TeamContent() {
    return (
        <ProductLanding
            productName="Team"
            productColor="bg-orange-500"
            badge="Real-time collaboration"
            headline="Your team's new home base"
            subheadline="Chat, share files, and collaborate in real-time. Keep everyone aligned with organized channels and powerful search."
            heroMockup={<TeamPreview />}
            features={features}
            capabilities={capabilities}
            ctaHeadline="Bring your team together"
            ctaSubheadline="Create your workspace, invite your team, and start collaborating in minutes. No setup required."
        />
    );
}

