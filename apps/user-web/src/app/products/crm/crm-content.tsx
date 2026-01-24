"use client";

import { 
    Users01, 
    Target01, 
    Mail01, 
    Phone01, 
    Calendar, 
    TrendUp01,
    Building07,
    CurrencyDollar,
    CheckCircle,
    Clock,
    BarChart01,
    PieChart01
} from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProductLanding, type ProductFeature, type ProductCapability } from "@/components/marketing/product-landing";
import { cx } from "@/lib/cx";

// Hero CRM Preview Component
const CRMPreview = () => (
    <div className="rounded-xl bg-bg-primary p-2 shadow-2xl ring-1 ring-border-secondary md:p-3">
        {/* Fake browser chrome */}
        <div className="mb-2 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-error-400" />
            <div className="size-2.5 rounded-full bg-warning-400" />
            <div className="size-2.5 rounded-full bg-success-400" />
            <div className="ml-3 flex-1 rounded bg-bg-tertiary px-3 py-1 text-[10px] text-text-quaternary">
                app.dreamteam.ai/crm
            </div>
        </div>

        <div className="flex rounded-lg bg-bg-primary">
            {/* Sidebar */}
            <div className="hidden w-40 shrink-0 border-r border-border-secondary bg-bg-secondary p-3 md:block">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500">
                        <Users01 className="size-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary">CRM</p>
                        <p className="text-[10px] text-text-tertiary">Pro</p>
                    </div>
                </div>
                <p className="mb-1.5 text-[9px] font-medium uppercase text-text-quaternary">Sales</p>
                <div className="space-y-0.5">
                    {["Pipeline", "Leads", "Contacts", "Companies", "Deals"].map((item, i) => (
                        <div key={item} className={cx("rounded px-2 py-1 text-[10px]", i === 0 ? "bg-bg-primary font-medium text-text-primary" : "text-text-tertiary")}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content - Pipeline View */}
            <div className="flex-1 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-medium text-text-quaternary">Pipeline</p>
                    <p className="text-xs font-semibold text-blue-600">$847,500 total</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { stage: "Qualified", count: 12, value: "$180K", color: "border-blue-400" },
                        { stage: "Meeting", count: 8, value: "$240K", color: "border-indigo-400" },
                        { stage: "Proposal", count: 5, value: "$320K", color: "border-purple-400" },
                        { stage: "Closed", count: 3, value: "$107K", color: "border-success-400" },
                    ].map((col) => (
                        <div key={col.stage} className={cx("rounded-lg bg-bg-secondary p-2 border-t-2", col.color)}>
                            <p className="text-[9px] font-medium text-text-primary">{col.stage}</p>
                            <p className="text-[10px] text-text-tertiary">{col.count} deals</p>
                            <p className="mt-1 text-xs font-semibold text-text-primary">{col.value}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Deals */}
                <p className="mb-2 mt-3 text-[10px] font-medium text-text-quaternary">Recent Deals</p>
                <div className="space-y-1.5">
                    {[
                        { name: "Acme Corp", value: "$45,000", stage: "Proposal", avatar: "AC" },
                        { name: "TechStart Inc", value: "$28,000", stage: "Meeting", avatar: "TS" },
                        { name: "Global Systems", value: "$67,000", stage: "Qualified", avatar: "GS" },
                    ].map((deal) => (
                        <div key={deal.name} className="flex items-center gap-2 rounded-lg bg-bg-secondary p-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[8px] font-semibold text-blue-600">
                                {deal.avatar}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-medium text-text-primary">{deal.name}</p>
                                <p className="text-[9px] text-text-tertiary">{deal.stage}</p>
                            </div>
                            <p className="text-[10px] font-semibold text-success-600">{deal.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Feature mockups
const PipelineMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Deal Pipeline</h3>
            <Badge color="brand" type="pill" size="sm">$847K pipeline</Badge>
        </div>
        <div className="space-y-2">
            {[
                { stage: "Qualified", deals: 12, value: "$180,000", percent: 21 },
                { stage: "Meeting Scheduled", deals: 8, value: "$240,000", percent: 28 },
                { stage: "Proposal Sent", deals: 5, value: "$320,000", percent: 38 },
                { stage: "Negotiation", deals: 2, value: "$75,000", percent: 9 },
                { stage: "Closed Won", deals: 3, value: "$32,500", percent: 4 },
            ].map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-3 rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {stage.deals}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">{stage.stage}</p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-bg-tertiary">
                            <div 
                                className="h-full rounded-full bg-blue-500" 
                                style={{ width: `${stage.percent}%` }}
                            />
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-text-primary">{stage.value}</p>
                </div>
            ))}
        </div>
    </div>
);

const LeadsMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Lead Scoring</h3>
            <span className="text-xs rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">AI Enhanced</span>
        </div>
        <div className="space-y-3">
            {[
                { name: "Sarah Chen", company: "Stripe", score: 95, status: "Hot", email: "sarah@stripe.com" },
                { name: "Michael Park", company: "Notion", score: 82, status: "Warm", email: "michael@notion.so" },
                { name: "Emily Davis", company: "Linear", score: 68, status: "Warm", email: "emily@linear.app" },
            ].map((lead) => (
                <div key={lead.name} className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                            <p className="text-xs text-text-tertiary">{lead.company}</p>
                        </div>
                        <div className={cx(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            lead.status === "Hot" ? "bg-error-100 text-error-700" : "bg-warning-100 text-warning-700"
                        )}>
                            {lead.score} pts
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                        <Mail01 className="size-3" />
                        {lead.email}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ForecastMockup = () => (
    <div className="space-y-4">
        <h3 className="font-semibold text-text-primary">Revenue Forecast</h3>
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                <p className="text-xs text-text-tertiary">This Quarter</p>
                <p className="text-xl font-bold text-blue-600">$284K</p>
                <p className="text-xs text-success-600">+18% vs target</p>
            </div>
            <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                <p className="text-xs text-text-tertiary">Win Rate</p>
                <p className="text-xl font-bold text-success-600">34%</p>
                <p className="text-xs text-success-600">+5% vs avg</p>
            </div>
        </div>
        <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
            <p className="mb-3 text-xs font-medium text-text-tertiary">Monthly Trend</p>
            <div className="flex items-end gap-2 h-20">
                {[45, 62, 38, 75, 58, 82].map((height, i) => (
                    <div 
                        key={i}
                        className="flex-1 rounded-t bg-blue-500"
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-text-quaternary">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
            </div>
        </div>
    </div>
);

const features: ProductFeature[] = [
    {
        title: "Visual Deal Pipeline",
        description: "See your entire sales process at a glance. Drag and drop deals between stages, track values, and never let an opportunity slip through the cracks.",
        bullets: [
            "Customizable pipeline stages",
            "Drag-and-drop deal management",
            "Automatic deal value tracking",
            "Stage conversion analytics",
        ],
        mockup: <PipelineMockup />,
    },
    {
        title: "AI-Powered Lead Scoring",
        description: "Focus on the leads most likely to convert. Our AI analyzes engagement, company data, and behavior to prioritize your hottest prospects.",
        bullets: [
            "Automatic lead scoring",
            "Engagement tracking",
            "Company enrichment data",
            "Priority inbox for sales reps",
        ],
        mockup: <LeadsMockup />,
        reverse: true,
    },
    {
        title: "Revenue Forecasting",
        description: "Know exactly where you'll land. AI-powered forecasting helps you predict revenue, set realistic targets, and exceed them.",
        bullets: [
            "Weighted pipeline forecasting",
            "Win rate analytics",
            "Quota tracking and alerts",
            "Historical trend analysis",
        ],
        mockup: <ForecastMockup />,
    },
];

const capabilities: ProductCapability[] = [
    { name: "Contacts", icon: Users01, description: "Manage relationships" },
    { name: "Companies", icon: Building07, description: "Account management" },
    { name: "Deals", icon: CurrencyDollar, description: "Track opportunities" },
    { name: "Tasks", icon: CheckCircle, description: "Stay organized" },
    { name: "Calendar", icon: Calendar, description: "Schedule meetings" },
    { name: "Email", icon: Mail01, description: "Track conversations" },
    { name: "Analytics", icon: BarChart01, description: "Sales insights" },
    { name: "Reports", icon: PieChart01, description: "Custom dashboards" },
];

export function CRMContent() {
    return (
        <ProductLanding
            productName="CRM"
            productColor="bg-blue-500"
            badge="Smart sales pipeline"
            headline="Close more deals with less effort"
            subheadline="Manage your entire sales process from first touch to closed deal. AI-powered insights help you focus on what matters."
            heroMockup={<CRMPreview />}
            features={features}
            capabilities={capabilities}
            ctaHeadline="Start closing more deals today"
            ctaSubheadline="Import your contacts, set up your pipeline, and let AI help you prioritize the deals most likely to close."
        />
    );
}

