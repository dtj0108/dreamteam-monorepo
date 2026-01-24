"use client";

import { BookOpen01, Folder, SearchLg, Stars01, File01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProductLanding, type ProductFeature, type ProductCapability } from "@/components/marketing/product-landing";
import { cx } from "@/lib/cx";

// Hero Dashboard Preview Component
const KnowledgePreview = () => (
    <div className="rounded-xl bg-bg-primary p-2 shadow-2xl ring-1 ring-border-secondary md:p-3">
        {/* Fake browser chrome */}
        <div className="mb-2 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-error-400" />
            <div className="size-2.5 rounded-full bg-warning-400" />
            <div className="size-2.5 rounded-full bg-success-400" />
            <div className="ml-3 flex-1 rounded bg-bg-tertiary px-3 py-1 text-[10px] text-text-quaternary">
                app.dreamteam.ai/knowledge
            </div>
        </div>

        <div className="flex rounded-lg bg-bg-primary">
            {/* Sidebar */}
            <div className="hidden w-44 shrink-0 border-r border-border-secondary bg-bg-secondary p-3 md:block">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500">
                        <BookOpen01 className="size-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary">Knowledge</p>
                        <p className="text-[10px] text-text-tertiary">Pro</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 rounded px-2 py-1 text-[10px] text-text-tertiary">
                        <Folder className="size-3" />
                        <span className="font-medium">Company</span>
                    </div>
                    <div className="ml-4 space-y-0.5">
                        <div className="flex items-center gap-2 rounded px-2 py-1 text-[10px] bg-bg-primary text-text-primary">
                            <File01 className="size-3" />
                            <span>Mission & Values</span>
                        </div>
                        <div className="flex items-center gap-2 rounded px-2 py-1 text-[10px] text-text-tertiary">
                            <File01 className="size-3" />
                            <span>Team Directory</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded px-2 py-1 text-[10px] text-text-tertiary">
                        <Folder className="size-3" />
                        <span className="font-medium">Engineering</span>
                    </div>
                    <div className="flex items-center gap-2 rounded px-2 py-1 text-[10px] text-text-tertiary">
                        <Folder className="size-3" />
                        <span className="font-medium">Sales</span>
                    </div>
                </div>
            </div>

            {/* Main Content - Document Editor */}
            <div className="flex-1 p-3 md:p-4">
                <div className="mb-3">
                    <p className="text-sm font-semibold text-text-primary">Mission & Values</p>
                    <p className="text-xs text-text-tertiary">Last edited 2 hours ago by Sarah K.</p>
                </div>
                <div className="space-y-2 text-xs text-text-secondary">
                    <p className="font-medium text-text-primary">Our Mission</p>
                    <p>We're building the future of work—where AI agents handle the busywork so teams can focus on what matters.</p>
                    <p className="mt-3 font-medium text-text-primary">Core Values</p>
                    <ul className="ml-4 list-disc space-y-1">
                        <li>Ship fast, learn faster</li>
                        <li>Transparency over everything</li>
                        <li>Customer obsession</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
);

// Feature mockups
const PagesMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Page Tree</h3>
            <Badge color="brand" type="pill" size="sm">24 pages</Badge>
        </div>
        <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
            <div className="space-y-1">
                {[
                    { name: "Company", type: "folder", indent: 0, children: 3 },
                    { name: "Mission & Values", type: "page", indent: 1 },
                    { name: "Team Directory", type: "page", indent: 1 },
                    { name: "Brand Guidelines", type: "page", indent: 1 },
                    { name: "Engineering", type: "folder", indent: 0, children: 5 },
                    { name: "Architecture Docs", type: "page", indent: 1 },
                    { name: "API Reference", type: "page", indent: 1 },
                    { name: "Sales", type: "folder", indent: 0, children: 4 },
                ].map((item, i) => (
                    <div
                        key={i}
                        className={cx(
                            "flex items-center gap-2 rounded px-2 py-1.5 text-sm",
                            item.type === "folder" ? "font-medium text-text-primary" : "text-text-secondary"
                        )}
                        style={{ paddingLeft: `${item.indent * 16 + 8}px` }}
                    >
                        {item.type === "folder" ? (
                            <Folder className="size-4 text-violet-500" />
                        ) : (
                            <File01 className="size-4 text-text-tertiary" />
                        )}
                        <span>{item.name}</span>
                        {item.children && (
                            <span className="text-xs text-text-quaternary">{item.children}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const TemplatesMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Templates</h3>
            <span className="text-xs text-text-tertiary">12 templates</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {[
                { name: "Meeting Notes", icon: "📝", uses: 47 },
                { name: "Project Brief", icon: "📋", uses: 32 },
                { name: "SOP Template", icon: "📖", uses: 28 },
                { name: "Decision Doc", icon: "⚖️", uses: 19 },
            ].map((template) => (
                <div key={template.name} className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="mb-2 text-2xl">{template.icon}</div>
                    <p className="text-sm font-medium text-text-primary">{template.name}</p>
                    <p className="text-xs text-text-tertiary">Used {template.uses} times</p>
                </div>
            ))}
        </div>
    </div>
);

const SearchMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">AI Search</h3>
            <Badge color="brand" type="pill" size="sm">
                <Stars01 className="mr-1 size-3" />
                AI Powered
            </Badge>
        </div>
        <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
                <SearchLg className="size-4 text-text-tertiary" />
                <span className="text-sm text-text-secondary">What's our refund policy?</span>
            </div>
            <div className="rounded-lg bg-violet-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                    <Stars01 className="size-4 text-violet-600" />
                    <span className="text-xs font-medium text-violet-700">AI Answer</span>
                </div>
                <p className="text-sm text-text-secondary">
                    Our refund policy allows full refunds within 30 days of purchase. After 30 days, pro-rated refunds are available...
                </p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Source:</span>
                    <span className="rounded bg-bg-primary px-2 py-0.5 text-xs text-violet-600">Sales / Policies</span>
                </div>
            </div>
        </div>
    </div>
);

const features: ProductFeature[] = [
    {
        title: "Hierarchical Pages",
        description: "Organize documentation in nested folders. Link between pages, embed rich content, and keep everything structured and findable.",
        bullets: [
            "Nested folders and subpages",
            "Rich text editor with markdown",
            "Page linking and embeds",
            "Full version history",
        ],
        mockup: <PagesMockup />,
    },
    {
        title: "Templates & Whiteboards",
        description: "Start from templates for meeting notes, project briefs, and SOPs. Collaborate on whiteboards for brainstorming.",
        bullets: [
            "Pre-built template library",
            "Custom template creation",
            "Collaborative whiteboards",
            "Meeting notes with action items",
        ],
        mockup: <TemplatesMockup />,
        reverse: true,
    },
    {
        title: "AI Search & Q&A",
        description: "Search across your entire knowledge base with AI. Ask questions in natural language and get instant, sourced answers.",
        bullets: [
            "Semantic search across all docs",
            "Natural language Q&A",
            "Context-aware answers",
            "Source citations included",
        ],
        mockup: <SearchMockup />,
    },
];

const capabilities: ProductCapability[] = [
    { name: "Pages", emoji: "📄", description: "Rich documents" },
    { name: "Folders", emoji: "📁", description: "Organize docs" },
    { name: "Templates", emoji: "📝", description: "Start faster" },
    { name: "Whiteboards", emoji: "🎨", description: "Visual collab" },
    { name: "Search", emoji: "🔍", description: "Find anything" },
    { name: "Comments", emoji: "💬", description: "Discuss inline" },
    { name: "Versions", emoji: "🔄", description: "Full history" },
    { name: "Sharing", emoji: "🔗", description: "Access control" },
];

export function KnowledgeContent() {
    return (
        <ProductLanding
            productName="Knowledge"
            productColor="bg-violet-500"
            badge="Your company's second brain"
            headline="Documentation that writes itself"
            subheadline="Notion-like pages, templates, and whiteboards—organized hierarchically and searchable by AI. Agents create SOPs from conversations and answer questions from your entire knowledge base."
            heroMockup={<KnowledgePreview />}
            features={features}
            capabilities={capabilities}
            ctaHeadline="Build your knowledge base"
            ctaSubheadline="Create your first page and let AI help you organize everything. Free for 14 days."
        />
    );
}
