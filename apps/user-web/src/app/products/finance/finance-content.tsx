"use client";

import { 
    Upload01, 
    Stars01, 
    RefreshCw01, 
    Target01, 
    BarChart01, 
    FileCheck02, 
    Calendar, 
    ChartBreakoutSquare,
    TrendUp01,
    Rocket02
} from "@untitledui/icons";
import { FileText } from "lucide-react";
import { Badge } from "@/components/base/badges/badges";
import { ProductLanding, type ProductFeature, type ProductCapability } from "@/components/marketing/product-landing";
import { cx } from "@/lib/cx";

// Hero Dashboard Preview Component
const DashboardPreview = () => (
    <div className="rounded-xl bg-bg-primary p-2 shadow-2xl ring-1 ring-border-secondary md:p-3">
        {/* Fake browser chrome */}
        <div className="mb-2 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-error-400" />
            <div className="size-2.5 rounded-full bg-warning-400" />
            <div className="size-2.5 rounded-full bg-success-400" />
            <div className="ml-3 flex-1 rounded bg-bg-tertiary px-3 py-1 text-[10px] text-text-quaternary">
                app.dreamteam.ai/finance
            </div>
        </div>

        <div className="flex rounded-lg bg-bg-primary">
            {/* Sidebar */}
            <div className="hidden w-40 shrink-0 border-r border-border-secondary bg-bg-secondary p-3 md:block">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500">
                        <BarChart01 className="size-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary">Finance</p>
                        <p className="text-[10px] text-text-tertiary">Pro</p>
                    </div>
                </div>
                <p className="mb-1.5 text-[9px] font-medium uppercase text-text-quaternary">Platform</p>
                <div className="space-y-0.5">
                    {["Dashboard", "Accounts", "Transactions", "Subscriptions", "Budgets"].map((item, i) => (
                        <div key={item} className={cx("rounded px-2 py-1 text-[10px]", i === 0 ? "bg-bg-primary font-medium text-text-primary" : "text-text-tertiary")}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 md:p-4">
                <p className="mb-2 text-[10px] font-medium text-text-quaternary">This Month</p>
                <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Total Balance</p>
                        <p className="text-sm font-bold text-text-primary md:text-base">$370,318</p>
                    </div>
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Income</p>
                        <p className="text-sm font-bold text-success-600 md:text-base">$24,500</p>
                    </div>
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Expenses</p>
                        <p className="text-sm font-bold text-error-600 md:text-base">$18,220</p>
                    </div>
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Net Profit</p>
                        <p className="text-sm font-bold text-success-600 md:text-base">$6,280</p>
                    </div>
                </div>

                <p className="mb-2 mt-3 text-[10px] font-medium text-text-quaternary">All Time</p>
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Total Income</p>
                        <p className="text-sm font-bold text-success-600 md:text-base">$2,044,559</p>
                    </div>
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Total Expenses</p>
                        <p className="text-sm font-bold text-error-600 md:text-base">$1,845,222</p>
                    </div>
                    <div className="rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                        <p className="text-[9px] text-text-tertiary">Net Profit</p>
                        <p className="text-sm font-bold text-success-600 md:text-base">$199,337</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Feature mockups
const ImportMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Import Transactions</h3>
            <Badge color="success" type="pill" size="sm">AI Categorized</Badge>
        </div>
        <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
            <div className="flex items-center gap-2 border-b border-border-secondary pb-2">
                <Upload01 className="size-4 text-emerald-600" />
                <span className="text-sm font-medium text-text-secondary">mercury_statement.csv</span>
                <span className="ml-auto text-xs text-success-600">156 transactions</span>
            </div>
            <div className="mt-3 space-y-2">
                {[
                    { desc: "AWS", amount: "-$2,847.00", cat: "Infrastructure", color: "bg-emerald-500" },
                    { desc: "GUSTO PAYROLL", amount: "-$34,200.00", cat: "Payroll", color: "bg-success-500" },
                    { desc: "SLACK TECH", amount: "-$1,250.00", cat: "Software", color: "bg-warning-500" },
                ].map((tx) => (
                    <div key={tx.desc} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Stars01 className="size-3 text-emerald-400" />
                            <span className="text-text-secondary">{tx.desc}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cx("size-2 rounded-full", tx.color)} />
                            <span className="text-xs text-text-tertiary">{tx.cat}</span>
                            <span className="font-medium text-text-primary">{tx.amount}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ReportsMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Scheduled Reports</h3>
            <span className="text-xs rounded-full bg-success-100 px-2 py-1 font-medium text-success-700">Active</span>
        </div>
        <div className="space-y-3">
            {[
                { name: "Weekly P&L Summary", schedule: "Every Monday, 8am", recipients: "3 recipients" },
                { name: "Monthly Expense Report", schedule: "1st of month, 9am", recipients: "5 recipients" },
                { name: "Daily Cash Position", schedule: "Daily, 7am", recipients: "1 recipient" },
            ].map((report) => (
                <div key={report.name} className="flex items-center justify-between rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                            <FileText className="size-4" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">{report.name}</p>
                            <p className="text-xs text-text-tertiary">{report.schedule}</p>
                        </div>
                    </div>
                    <p className="text-xs text-text-tertiary">{report.recipients}</p>
                </div>
            ))}
        </div>
    </div>
);

const ValuationMockup = () => (
    <div className="space-y-4">
        <h3 className="font-semibold text-text-primary">Exit Dashboard</h3>
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                <p className="text-xs text-text-tertiary">Est. Valuation</p>
                <p className="text-xl font-bold text-emerald-600">$3.2M</p>
                <p className="text-xs text-text-tertiary">5x ARR multiple</p>
            </div>
            <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                <p className="text-xs text-text-tertiary">ARR</p>
                <p className="text-xl font-bold text-success-600">$640K</p>
                <p className="text-xs text-success-600">+42% YoY</p>
            </div>
        </div>
        <div className="rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
            <p className="mb-3 text-xs font-medium text-text-tertiary">Exit Readiness</p>
            <div className="space-y-2">
                {[
                    { name: "Revenue Growth", percent: 85, color: "bg-success-500" },
                    { name: "Profit Margin", percent: 72, color: "bg-emerald-500" },
                    { name: "Clean Books", percent: 95, color: "bg-success-500" },
                ].map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                        <div className={cx("h-2 rounded-full", cat.color)} style={{ width: `${cat.percent}%` }} />
                        <span className="min-w-24 text-xs text-text-tertiary">{cat.name}</span>
                        <span className="text-xs font-medium text-text-secondary">{cat.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const features: ProductFeature[] = [
    {
        title: "Smart Import + AI Categorization",
        description: "Upload CSV exports from any business bank account or card. Our AI automatically maps columns, detects vendors, and categorizes every expense.",
        bullets: [
            "Import from any business bank CSV",
            "AI-powered expense categorization",
            "Automatic vendor detection",
            "Bulk edit and recategorize anytime",
        ],
        mockup: <ImportMockup />,
    },
    {
        title: "Automatic Reports",
        description: "Set it and forget it. Schedule daily, weekly, or monthly reports delivered straight to your inbox. Always know where your business stands.",
        bullets: [
            "Scheduled P&L and expense reports",
            "Daily, weekly, or monthly delivery",
            "Email reports to your team or investors",
            "Custom date ranges and filters",
        ],
        mockup: <ReportsMockup />,
        reverse: true,
    },
    {
        title: "Valuation & Exit Planning",
        description: "Know your number. Track the KPIs buyers care about, model your valuation, and build toward your exit with clear targets.",
        bullets: [
            "Revenue multiples and valuation modeling",
            "Industry KPIs: MRR, ARR, margins, churn",
            "Runway and cash flow projections",
            "Exit timeline and milestone tracking",
        ],
        mockup: <ValuationMockup />,
    },
];

const capabilities: ProductCapability[] = [
    { name: "CSV Import", icon: Upload01, description: "Any bank format" },
    { name: "AI Categorization", icon: Stars01, description: "Auto-categorize" },
    { name: "Vendor Tracker", icon: RefreshCw01, description: "SaaS & vendors" },
    { name: "Budgets", icon: Target01, description: "Expense alerts" },
    { name: "Analytics", icon: BarChart01, description: "P&L, Cash Flow" },
    { name: "Exit Planning", icon: FileCheck02, description: "Valuation goals" },
    { name: "Calendar", icon: Calendar, description: "Bill reminders" },
    { name: "KPIs", icon: ChartBreakoutSquare, description: "Industry metrics" },
];

export function FinanceContent() {
    return (
        <ProductLanding
            productName="Finance"
            productColor="bg-emerald-500"
            badge="AI-powered bookkeeping"
            headline="From import to valuation, powered by AI"
            subheadline="Import your transactions, let AI organize your books, and get the metrics buyers actually care about. Build a business worth selling."
            heroMockup={<DashboardPreview />}
            features={features}
            capabilities={capabilities}
            ctaHeadline="Start building your exit-ready financials"
            ctaSubheadline="Upload your first CSV, let AI clean up your books, and see your valuation in minutes."
        />
    );
}

