"use client";

import { type FC, type HTMLAttributes, type ReactNode, useState } from "react";
import {
    CheckCircle,
    Stars01,
    PlayCircle,
    Users01,
    ArrowRight,
    CpuChip01,
    Globe01,
    RefreshCw01,
    File01,
    Database01,
    Tool01,
} from "@untitledui/icons";
import { Collection, Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { DreamTeamLogo } from "@/components/foundations/logo/dreamteam-logo";
import { Header } from "@/components/marketing/header-navigation/header";
import { RatingBadge } from "@/components/foundations/rating-badge";
import { GitHub, LinkedIn, X } from "@/components/foundations/social-icons";
import { cx } from "@/lib/cx";

import HeroSection25 from "@/components/shadcn-studio/blocks/hero-section-25/hero-section-25";
import FeaturesSection12 from "@/components/shadcn-studio/blocks/features-section-12/features-section-12";
import AppIntegration from "@/components/shadcn-studio/blocks/app-integration-07/app-integration-07";
import FeaturesSection16 from "@/components/shadcn-studio/blocks/features-section-16/features-section-16";
import FeaturesSection14 from "@/components/shadcn-studio/blocks/features-section-14/features-section-14";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/" },
];

const footerNavList = [
    {
        label: "Products",
        items: [
            { label: "Finance", href: "/products/finance" },
            { label: "Sales", href: "/products/crm" },
            { label: "Team", href: "/products/team" },
            { label: "Knowledge", href: "/products/knowledge" },
            { label: "Projects", href: "/products/projects" },
        ],
    },
    {
        label: "Resources",
        items: [
            { label: "Blog", href: "#" },
            { label: "Help Center", href: "#" },
            { label: "Tutorials", href: "/learn" },
            { label: "API Docs", href: "#" },
        ],
    },
    {
        label: "Company",
        items: [
            { label: "About", href: "/about" },
            { label: "Careers", href: "#" },
            { label: "Contact", href: "#" },
        ],
    },
    {
        label: "Legal",
        items: [
            { label: "Terms", href: "#" },
            { label: "Privacy", href: "#" },
            { label: "Cookies", href: "#" },
        ],
    },
];

const products = [
    {
        name: "Finance",
        tagline: "Bookkeeping that runs itself",
        description: "Auto-categorize transactions, track budgets, reconcile accounts, monitor cash flow, and plan your exit—all handled by AI agents.",
        emoji: "💰",
        color: "bg-gray-300",
        gradient: "from-gray-300 to-gray-400",
        href: "/products/finance",
        features: ["Auto-categorization", "Budget alerts", "Cash flow tracking", "Exit planning"],
    },
    {
        name: "Sales",
        tagline: "Pipeline on autopilot",
        description: "Score leads, track deals, automate follow-ups via SMS and calls, and forecast revenue—agents handle the busywork so you close more.",
        emoji: "🤝",
        color: "bg-gray-300",
        gradient: "from-gray-300 to-gray-400",
        href: "/products/crm",
        features: ["Lead scoring", "SMS & call automation", "Deal intelligence", "Workflows"],
    },
    {
        name: "Team",
        tagline: "Collaboration with agents",
        description: "Real-time messaging, channels, DMs—plus AI agents that summarize threads, answer questions, and automate workflows.",
        emoji: "💬",
        color: "bg-gray-300",
        gradient: "from-gray-300 to-gray-400",
        href: "/products/team",
        features: ["Channels & DMs", "Mentions & reactions", "Thread summaries", "Agent Q&A"],
    },
    {
        name: "Knowledge",
        tagline: "Your company's second brain",
        description: "Notion-like pages, templates, and whiteboards. Agents organize documentation, create SOPs, and answer questions from your knowledge base.",
        emoji: "📚",
        color: "bg-gray-300",
        gradient: "from-gray-300 to-gray-400",
        href: "/products/knowledge",
        features: ["Hierarchical pages", "Templates library", "Whiteboards", "AI search"],
    },
    {
        name: "Projects",
        tagline: "Work that tracks itself",
        description: "Tasks, milestones, Kanban boards, and timeline views. Agents auto-assign based on workload and document everything.",
        emoji: "📋",
        color: "bg-gray-300",
        gradient: "from-gray-300 to-gray-400",
        href: "/products/projects",
        features: ["Task management", "Kanban & Timeline", "Workload balancing", "Auto-assignment"],
    },
];

// AI Agents Hero Preview - OS Interface
const OSPreview = () => (
    <div className="rounded-2xl bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-800 md:p-4">
        {/* Browser chrome */}
        <div className="mb-3 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-red-500" />
            <div className="size-2.5 rounded-full bg-yellow-500" />
            <div className="size-2.5 rounded-full bg-green-500" />
            <div className="ml-3 flex-1 rounded bg-slate-800 px-3 py-1 text-[10px] text-slate-400">
                app.dreamteam.ai
            </div>
        </div>

        <div className="flex rounded-xl bg-slate-950">
            {/* Sidebar - OS Navigation */}
            <div className="hidden w-56 shrink-0 border-r border-slate-800 p-3 md:block">
                <div className="mb-5 flex items-center gap-2">
                    <div>
                        <p className="text-xs font-bold text-white">dreamteam.ai</p>
                        <p className="text-[10px] text-emerald-400">● 7 agents online</p>
                    </div>
                </div>

                <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-slate-500">Products</p>
                <div className="space-y-1">
                    {[
                        { name: "Finance", emoji: "💰", color: "bg-emerald-500", status: "127 txns categorized" },
                        { name: "Sales", emoji: "🤝", color: "bg-blue-500", status: "4 deals closing today" },
                        { name: "Team", emoji: "💬", color: "bg-orange-500", status: "2 new messages" },
                        { name: "Knowledge", emoji: "📚", color: "bg-violet-500", status: "Docs up to date" },
                        { name: "Projects", emoji: "📋", color: "bg-cyan-500", status: "12 tasks assigned" },
                    ].map((app) => (
                        <div key={app.name} className="flex items-center gap-2.5 rounded-lg bg-slate-900/50 px-2.5 py-1.5 hover:bg-slate-800/50">
                            <div className={cx("flex size-6 items-center justify-center rounded-md", app.color)}>
                                <span className="text-xs">{app.emoji}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-medium text-slate-200">{app.name}</span>
                                <p className="text-[9px] text-slate-500 truncate">{app.status}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mb-2 mt-4 text-[9px] font-medium uppercase tracking-wider text-slate-500">Active Agents</p>
                <div className="space-y-1">
                    {[
                        { name: "Budget Coach", emoji: "💰", task: "Analyzing spending..." },
                        { name: "Sales Agent", emoji: "🤝", task: "Following up leads..." },
                        { name: "Project Manager", emoji: "📋", task: "Assigning tasks..." },
                        { name: "Knowledge Curator", emoji: "📚", task: "Updating docs..." },
                    ].map((agent) => (
                        <div key={agent.name} className="flex items-center gap-2 px-1">
                            <span className="text-sm">{agent.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-slate-300">{agent.name}</span>
                                <p className="text-[9px] text-slate-600 truncate">{agent.task}</p>
                            </div>
                            <div className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-lg bg-slate-800/50 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-400">Agent Memory</span>
                        <span className="text-[9px] text-emerald-400">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Database01 className="size-3 text-purple-400" />
                        <span className="text-[10px] text-slate-300">42 memories stored</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4">
                <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                        <p className="text-sm font-semibold text-white">Command Center</p>
                        <p className="text-[10px] text-slate-500">All systems operational</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1">
                            <File01 className="size-3 text-purple-400" />
                            <span className="text-[10px] font-medium text-purple-400">3 skills</span>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1">
                            <div className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-medium text-emerald-400">7 agents</span>
                        </div>
                    </div>
                </div>

                {/* Agent Conversation */}
                <div className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5">
                            <p className="text-sm text-white">We just signed TechCorp as a client</p>
                        </div>
                    </div>

                    {/* AI Agent response */}
                    <div className="flex gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                            <Stars01 className="size-4 text-white" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="rounded-2xl rounded-tl-md bg-slate-800 px-4 py-3">
                                <p className="mb-3 text-sm text-slate-200">Great news! I've coordinated with the team:</p>

                                {/* Agent actions */}
                                <div className="space-y-2">
                                    {[
                                        { emoji: "🤝", agent: "Sales Agent", action: "Created deal, updated pipeline" },
                                        { emoji: "📋", agent: "Project Manager", action: "Created onboarding project" },
                                        { emoji: "📚", agent: "Knowledge Curator", action: "Created client docs" },
                                        { emoji: "💰", agent: "Budget Coach", action: "Updated revenue forecast" },
                                    ].map((item) => (
                                        <div key={item.agent} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
                                            <span className="text-sm">{item.emoji}</span>
                                            <span className="text-[10px] font-medium text-slate-300">{item.agent}</span>
                                            <ArrowRight className="size-3 text-slate-600" />
                                            <span className="text-[10px] text-slate-400">{item.action}</span>
                                            <CheckCircle className="ml-auto size-3 text-emerald-400" />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-400">
                                    <Database01 className="size-4" />
                                    <span className="text-[10px]">All agents updated memories with TechCorp context</span>
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="flex flex-wrap gap-2">
                                <button className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700">
                                    View project
                                </button>
                                <button className="rounded-full bg-slate-800 px-3 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-slate-700">
                                    Open deal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 p-3">
                    <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                        <Stars01 className="size-3 text-white" />
                    </div>
                    <span className="flex-1 text-[11px] text-slate-500">Ask your agents anything...</span>
                    <div className="rounded bg-slate-800 px-2 py-0.5 text-[9px] text-slate-500">⌘K</div>
                </div>
            </div>
        </div>
    </div>
);

const HeroSection = () => {
    return (
        <div className="relative overflow-hidden bg-white">
            {/* Background effects */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
            <div className="pointer-events-none absolute -left-40 top-0 size-[500px] rounded-full bg-blue-100/50 blur-3xl" />
            <div className="pointer-events-none absolute -right-40 top-40 size-[400px] rounded-full bg-cyan-100/50 blur-3xl" />
            
            {/* Grid pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

            <Header />

            <section className="relative overflow-hidden py-16 md:py-24">
                <div className="mx-auto w-full max-w-container px-4 md:px-8">
                    <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                        <h1 className="text-display-md font-semibold text-gray-900 md:text-display-lg lg:text-display-xl">
                            AI agents that{" "}
                            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                actually work
                            </span>
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg text-gray-600 md:mt-6 md:text-xl">
                            Not chatbots. Not assistants. Real AI agents with memory, skills, and tools—running your business autonomously.
                        </p>
                        <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-10">
                            <Button href="/demo/agents" iconLeading={PlayCircle} color="secondary" size="xl">
                                Watch Demo
                            </Button>
                            <Button href="/pricing" size="xl" className="bg-blue-600 hover:bg-blue-700">
                                Get Started Free
                            </Button>
                        </div>
                        
                        {/* Trust indicators */}
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="size-4 text-blue-600" />
                                <span>7 specialist agents included</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="size-4 text-blue-600" />
                                <span>Deploy in 5 minutes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="size-4 text-blue-600" />
                                <span>Enterprise-grade security</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OS Preview */}
                <div className="mx-auto mt-12 w-full max-w-5xl px-4 md:mt-16 md:px-8">
                    <OSPreview />
                </div>
            </section>
        </div>
    );
};

// Department data for the agent hierarchy
const agentHierarchies = [
    {
        name: "Finance",
        emoji: "💰",
        color: "#10B981", // emerald-500
        specialists: ["Budget Coach", "Expense Auditor", "Investment Advisor", "Report Generator"],
    },
    {
        name: "Sales",
        emoji: "📈",
        color: "#F59E0B", // amber-500
        specialists: ["Lead Scorer", "Follow-up Agent", "Pipeline Manager", "Forecaster"],
    },
    {
        name: "Operations",
        emoji: "⚙️",
        color: "#8B5CF6", // violet-500
        specialists: ["Project Manager", "Task Delegator", "Milestone Tracker", "Resource Planner"],
    },
    {
        name: "Knowledge",
        emoji: "📚",
        color: "#0EA5E9", // sky-500
        specialists: ["Curator", "Researcher", "Document Creator", "Q&A Agent"],
    },
];

const AgentsSection = () => {
    return (
        <section className="bg-gray-50 py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="mx-auto mb-12 flex w-full max-w-3xl flex-col items-center text-center md:mb-16">
                    <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">Agent Hierarchy</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-gray-900 md:text-display-md">
                        One unified intelligence
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 md:mt-5 md:text-xl">
                        Specialist agents organized in hierarchies—finance, sales, operations, knowledge—working together as a single cohesive being.
                    </p>
                </div>

                {/* Org Chart Style Visualization */}
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
                        {/* Central Orchestrator */}
                        <div className="flex flex-col items-center">
                            {/* Avatar circle */}
                            <div className="relative">
                                <div className="flex size-20 items-center justify-center rounded-full bg-gray-100 border-[3px] border-gray-300 shadow-md">
                                    <span className="text-3xl">🧠</span>
                                </div>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">Central Orchestrator</h3>
                            <p className="text-sm text-gray-500">Coordinates all hierarchies</p>

                            {/* Vertical line down */}
                            <div className="mt-6 h-10 w-px bg-gray-300" />

                            {/* Horizontal connector line */}
                            <div className="h-px w-full max-w-3xl bg-gray-300" />

                            {/* Department nodes */}
                            <div className="grid w-full max-w-4xl grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
                                {agentHierarchies.map((dept) => (
                                    <div key={dept.name} className="flex flex-col items-center">
                                        {/* Vertical line from horizontal bar */}
                                        <div className="h-6 w-px bg-gray-300" />

                                        {/* Department avatar */}
                                        <div
                                            className="flex size-14 items-center justify-center rounded-full border-[3px] bg-white shadow-md"
                                            style={{ borderColor: dept.color }}
                                        >
                                            <span className="text-2xl">{dept.emoji}</span>
                                        </div>
                                        <h4 className="mt-3 text-sm font-semibold text-gray-900">{dept.name}</h4>

                                        {/* Specialists list */}
                                        <div className="mt-4 flex flex-col items-center gap-2">
                                            {dept.specialists.map((specialist) => (
                                                <div
                                                    key={specialist}
                                                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1"
                                                >
                                                    <div
                                                        className="size-2 rounded-full"
                                                        style={{ backgroundColor: dept.color }}
                                                    />
                                                    <span className="text-xs text-gray-600">{specialist}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Benefits */}
                <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:mt-16 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                        <h3 className="font-semibold text-gray-900">Hierarchical Coordination</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Agents delegate up and down the hierarchy, ensuring the right specialist handles each task.
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                        <h3 className="font-semibold text-gray-900">Autonomous Execution</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            One command triggers a cascade of coordinated actions across multiple specialists.
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                        <h3 className="font-semibold text-gray-900">Unified Intelligence</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            All agents share context and memory, working as one cohesive system.
                        </p>
                    </div>
                </div>

                {/* Custom Agent CTA */}
                <div className="mt-12 flex flex-col items-center text-center md:mt-16">
                    <h3 className="text-xl font-semibold text-gray-900">Extend with custom agents</h3>
                    <p className="mt-2 max-w-md text-gray-600">Build your own specialists and add them to any hierarchy. No code required.</p>
                    <Button href="/pricing" className="mt-6" size="lg">
                        Get Started Free
                    </Button>
                </div>
            </div>
        </section>
    );
};

const SuperpowersSection = () => {
    return (
        <section className="bg-white py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="mx-auto mb-12 flex w-full max-w-3xl flex-col items-center text-center md:mb-16">
                    <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">What Makes Us Different</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-gray-900 md:text-display-md">
                        Agent superpowers
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 md:mt-5 md:text-xl">
                        Not just AI. Agents with memory, skills, and tools that make them genuinely autonomous.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                        <Button href="/demo/crm" color="secondary" size="xl">
                            Explore Workspace
                        </Button>
                        <Button href="/pricing" size="xl" className="bg-blue-600 hover:bg-blue-700">
                            Deploy Agents
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🧠</span>
                            <h3 className="text-lg font-semibold text-gray-900">Memory that lasts</h3>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            Agents remember everything. User preferences. Past decisions. Project context. They learn from every interaction.
                        </p>
                        <div className="mt-5 rounded-lg bg-gray-900 p-4 font-mono text-xs text-gray-400">
                            <div className="text-gray-500">/memories/</div>
                            <div className="ml-2 text-emerald-400">├── users/drew.md</div>
                            <div className="ml-2 text-emerald-400">├── projects/techcorp.md</div>
                            <div className="ml-2 text-emerald-400">└── facts.md</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✨</span>
                            <h3 className="text-lg font-semibold text-gray-900">Skills you can teach</h3>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            Give agents new abilities with natural language. Write a skill once in markdown, agents use it forever.
                        </p>
                        <div className="mt-5 rounded-lg bg-gray-900 p-4 font-mono text-xs text-gray-400">
                            <div className="text-blue-400"># Project Planner</div>
                            <div className="mt-1 text-gray-500">When creating projects:</div>
                            <div className="text-emerald-400">1. Break into milestones</div>
                            <div className="text-emerald-400">2. Auto-assign by workload</div>
                            <div className="text-emerald-400">3. Create documentation</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🛠️</span>
                            <h3 className="text-lg font-semibold text-gray-900">16 tools at their fingertips</h3>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            From querying transactions to creating projects to searching the web. Agents chain up to 10 actions autonomously.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {["Transactions", "Budgets", "Leads", "Projects", "Tasks", "Knowledge", "Web Search", "Export"].map((tool) => (
                                <span key={tool} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                    {tool}
                                </span>
                            ))}
                            <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                                +8 more
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const WhySection = () => {
    return (
        <section className="bg-gray-50 py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="mx-auto mb-12 flex w-full max-w-3xl flex-col items-center text-center md:mb-16">
                    <h2 className="text-display-sm font-semibold text-gray-900 md:text-display-md">
                        One command. Five agents.<br />Everything updated.
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 md:mt-5 md:text-xl">
                        That's the power of unified intelligence. Agents share context and coordinate automatically.
                    </p>
                </div>

                <div className="mx-auto max-w-4xl">
                    {/* The Magic Flow */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
                            <div className="size-8 rounded-full bg-blue-600 text-center text-sm leading-8 text-white">You</div>
                            <span className="font-medium text-gray-900">"We just signed TechCorp as a client"</span>
                        </div>

                        <div className="space-y-3">
                            {[
                                { agent: "Sales Agent", emoji: "🤝", action: "Creates deal, updates pipeline, logs activity" },
                                { agent: "Project Manager", emoji: "📋", action: "Creates onboarding project with tasks" },
                                { agent: "Knowledge Curator", emoji: "📚", action: "Creates client documentation page" },
                                { agent: "Budget Coach", emoji: "💰", action: "Updates revenue forecast" },
                            ].map((item, index) => (
                                <div key={item.agent} className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{item.emoji}</span>
                                        <span className="font-medium text-gray-700">{item.agent}</span>
                                    </div>
                                    <ArrowRight className="size-4 text-gray-400" />
                                    <span className="text-gray-600">{item.action}</span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <div className="size-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-medium text-emerald-600">Done</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
                            <CheckCircle className="size-5" />
                            <span className="font-medium">All agents updated their memories with TechCorp context</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-8 md:grid-cols-3">
                    {[
                        {
                            icon: CpuChip01,
                            title: "Agents, not features",
                            description: "Real AI agents that take action. Not chatbots that give suggestions. They do the work.",
                        },
                        {
                            icon: RefreshCw01,
                            title: "Always running",
                            description: "Agents work 24/7. Processing transactions at 3am. Following up leads on weekends. Never stopping.",
                        },
                        {
                            icon: Globe01,
                            title: "Unified intelligence",
                            description: "One system, shared context. Your Sales Agent knows what Finance Agent knows. No silos.",
                        },
                    ].map((item) => (
                        <div key={item.title} className="flex flex-col items-center text-center">
                            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-600">
                                <item.icon className="size-7 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                            <p className="mt-2 text-gray-600">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ProductsSection = () => {
    return (
        <section className="bg-white py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="mx-auto mb-12 flex w-full max-w-3xl flex-col items-center text-center md:mb-16">
                    <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">The Platform</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-gray-900 md:text-display-md">
                        Five products. One brain.
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 md:mt-5 md:text-xl">
                        Everything you need to run your business, unified with AI agents that share context.
                    </p>
                </div>

                {/* First row: 3 products */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {products.slice(0, 3).map((product) => (
                        <div
                            key={product.name}
                            className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div className={cx(
                                    "flex size-12 items-center justify-center rounded-xl",
                                    product.color
                                )}>
                                    <span className="text-2xl">{product.emoji}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-600">Agent active</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                            <p className="mt-1 text-sm font-medium text-blue-600">{product.tagline}</p>
                            <p className="mt-3 flex-1 text-sm text-gray-600">{product.description}</p>
                            <ul className="mt-4 flex flex-wrap gap-1.5">
                                {product.features.map((feature) => (
                                    <li key={feature} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6">
                                <Button href={product.href} color="secondary" size="md" iconTrailing={<ArrowRight />} className="w-full justify-center">
                                    Explore {product.name}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Second row: 2 products */}
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                    {products.slice(3).map((product) => (
                        <div
                            key={product.name}
                            className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg md:flex-row md:items-start md:gap-6"
                        >
                            <div className="flex-1">
                                <div className="mb-4 flex items-center justify-between md:justify-start md:gap-4">
                                    <div className={cx(
                                        "flex size-12 items-center justify-center rounded-xl",
                                        product.color
                                    )}>
                                        <span className="text-2xl">{product.emoji}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
                                        <span className="text-xs font-medium text-emerald-600">Agent active</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                                <p className="mt-1 text-sm font-medium text-blue-600">{product.tagline}</p>
                                <p className="mt-3 text-sm text-gray-600">{product.description}</p>
                                <ul className="mt-4 flex flex-wrap gap-1.5">
                                    {product.features.map((feature) => (
                                        <li key={feature} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6">
                                    <Button href={product.href} color="secondary" size="md" iconTrailing={<ArrowRight />}>
                                        Explore {product.name}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const MetricsSection = () => {
    return (
        <section className="bg-gray-900 py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col gap-12 md:gap-16">
                    <div className="flex w-full flex-col items-center self-center text-center md:max-w-3xl">
                        <h2 className="text-display-sm font-semibold text-white md:text-display-md">
                            Agents working around the clock
                        </h2>
                        <p className="mt-4 text-lg text-gray-400 md:mt-5 md:text-xl">
                            While you're reading this, thousands of agents are closing deals, categorizing transactions, and creating projects.
                        </p>
                    </div>
                    <dl className="grid w-full max-w-4xl grid-cols-2 gap-8 self-center md:grid-cols-4">
                        {[
                            { title: "7", subtitle: "Agents per workspace" },
                            { title: "100M+", subtitle: "Agent actions" },
                            { title: "24/7", subtitle: "Autonomous operation" },
                            { title: "99.99%", subtitle: "Uptime" },
                        ].map((item) => (
                            <div key={item.title} className="flex flex-col items-center gap-2 text-center">
                                <dd className="text-display-md font-bold text-white md:text-display-lg">{item.title}</dd>
                                <dt className="text-md font-medium text-gray-400">{item.subtitle}</dt>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
};

const reviews = [
    {
        id: "review-01",
        quote: "I deployed 7 agents on Monday. By Friday, they had processed 10,000 transactions, closed 4 deals, and created documentation I didn't even know I needed. I didn't lift a finger.",
        author: { name: "Marcus Chen", role: "CEO, DevTools.io", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    },
    {
        id: "review-02",
        quote: "The agents remembered that I hate manual categorization. Now they learn my preferences and just... do it. It's like having the perfect employee who never forgets.",
        author: { name: "Sarah Martinez", role: "CFO, Brightside", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    },
    {
        id: "review-03",
        quote: "We used to have 3 people doing what the agents do now. Not replacing them—reassigning them to actual strategic work. Everyone's happier.",
        author: { name: "James Wilson", role: "COO, TechCorp", avatar: "https://randomuser.me/api/portraits/men/52.jpg" },
    },
];

const TestimonialsSection = () => {
    const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);

    return (
        <Tabs
            selectedKey={reviews[selectedReviewIndex].id}
            onSelectionChange={(value) => setSelectedReviewIndex(reviews.findIndex((review) => review.id === value))}
        >
            <section className="bg-white py-16 md:py-24">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="flex flex-col items-center gap-12 md:gap-16">
                        {/* Navigation dots - must be rendered before TabPanels */}
                        <TabList className="flex gap-2 order-2" items={reviews}>
                            {(review) => (
                                <Tab id={review.id} className="size-2.5 cursor-pointer rounded-full bg-gray-300 transition-colors data-[selected]:bg-blue-600" />
                            )}
                        </TabList>

                        <Collection items={reviews}>
                            {(review) => (
                                <TabPanel id={review.id} className="flex flex-col gap-8 text-center order-1">
                                    <blockquote className="mx-auto max-w-3xl text-xl font-medium text-balance text-gray-900 md:text-2xl lg:text-display-xs">
                                        &ldquo;{review.quote}&rdquo;
                                    </blockquote>
                                    <figcaption className="flex justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Avatar src={review.author.avatar} alt={review.author.name} size="xl" />
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-md font-semibold text-gray-900">{review.author.name}</p>
                                                <cite className="text-sm text-gray-500 not-italic">{review.author.role}</cite>
                                            </div>
                                        </div>
                                    </figcaption>
                                </TabPanel>
                            )}
                        </Collection>
                    </div>
                </div>
            </section>
        </Tabs>
    );
};

const CTASection = () => {
    return (
        <section className="bg-gradient-to-b from-gray-50 to-blue-50 py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center gap-8 text-center">
                    <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                        <div className="size-2 animate-pulse rounded-full bg-blue-600" />
                        7 agents ready to deploy
                    </div>
                    <h2 className="max-w-2xl text-display-sm font-semibold text-gray-900 md:text-display-md">
                        Your AI workforce is ready
                    </h2>
                    <p className="max-w-xl text-lg text-gray-600">
                        Deploy 7 autonomous agents in 5 minutes. No credit card required. Start free forever.
                    </p>
                    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start">
                        <Button color="secondary" size="xl" href="/demo/agents">
                            Watch Demo
                        </Button>
                        <Button href="/pricing" size="xl" className="bg-blue-600 hover:bg-blue-700">
                            Deploy Your Agents
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="py-12 md:py-16">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="flex flex-col gap-12 md:gap-16 xl:flex-row">
                        <div className="flex flex-col items-start gap-6 md:w-80">
                            <DreamTeamLogo />
                            <p className="text-md text-gray-600">
                                Business in the AI era.
                            </p>
                        </div>
                        <nav className="flex-1">
                            <ul className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-4">
                                {footerNavList.map((category) => (
                                    <li key={category.label}>
                                        <h4 className="text-sm font-semibold text-gray-900">{category.label}</h4>
                                        <ul className="mt-4 flex flex-col gap-3">
                                            {category.items.map((item) => (
                                                <li key={item.label}>
                                                    <a href={item.href} className="text-md text-gray-600 transition-colors hover:text-gray-900">
                                                        {item.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 py-8 md:py-10">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
                        <p className="text-sm text-gray-500">© 2025 dreamteam.ai. All rights reserved.</p>
                        <ul className="flex gap-5">
                            {footerSocials.map(({ label, icon: Icon, href }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 transition-colors hover:text-gray-600"
                                    >
                                        <Icon size={20} aria-label={label} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export function LandingPage() {
    return (
        <div className="bg-white dark:bg-background">
            <Header />
            <HeroSection25 />
            <FeaturesSection12 />
            <FeaturesSection16 />
            <FeaturesSection14 />
            <ProductsSection />
            <AppIntegration />
            <MetricsSection />
            <TestimonialsSection />
            <CTASection />
            <Footer />
        </div>
    );
}

export default LandingPage;
