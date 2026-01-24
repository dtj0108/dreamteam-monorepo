"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Header } from "@/components/marketing/header-navigation/header";
import { DreamTeamLogo } from "@/components/foundations/logo/dreamteam-logo";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { GitHub, LinkedIn, X } from "@/components/foundations/social-icons";
import { cx } from "@/lib/cx";
import { PricingCTA } from "@/components/billing/pricing-cta";

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
            { label: "Projects", href: "/products/projects" },
            { label: "Knowledge", href: "/products/knowledge" },
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

// Workspace plans (Monthly + Annual)
const workspacePlans = [
    {
        id: "monthly",
        name: "Monthly",
        price: 49,
        period: "/month",
        subtext: "Billed monthly",
        popular: false,
        savings: "Cancel anytime",
    },
    {
        id: "annual",
        name: "Annual",
        price: 39,
        period: "/month",
        subtext: "$468/year, billed annually",
        popular: true,
        savings: "Save 20% vs monthly",
    },
];

const workspaceFeatures = [
    "All 5 products (Finance, Sales, Team, Projects, Knowledge)",
    "Unlimited accounts & transactions",
    "Analytics & reporting",
    "100 GB storage",
    "Up to 10 users included",
    "+$10/mo per additional user",
    "Priority support",
];

// Agent tiers with organizational expansion model
const agentTiers = [
    {
        id: "startup",
        name: "Lean Startup",
        price: 3000,
        priceDisplay: "$3K",
        agentCount: 7,
        humanEquivalent: "$840K",
        tagline: "You + a few killers in one room",
        description: "What should I do, and how do I actually do it?",
        popular: false,
        departments: [
            { name: "Leadership", agents: ["Founder Agent"] },
            { name: "Execution", agents: ["Operations Agent"] },
            { name: "Sales", agents: ["Sales Agent"] },
            { name: "Marketing", agents: ["Marketing Agent"] },
            { name: "Finance", agents: ["Finance Agent"] },
            { name: "Systems", agents: ["Systems Agent"] },
            { name: "People", agents: ["Performance Agent"] },
        ],
    },
    {
        id: "teams",
        name: "Department Teams",
        price: 5000,
        priceDisplay: "$5K",
        agentCount: 18,
        humanEquivalent: "$2.2M",
        tagline: "Now you've got specialists",
        description: "How do I make this run smoother and make more money?",
        popular: true,
        departments: [
            { name: "Leadership", agents: ["Vision Agent", "Decision Agent", "Planning Agent"] },
            { name: "Execution", agents: ["Task Breakdown Agent", "Process Agent", "Accountability Agent"] },
            { name: "Sales", agents: ["Script Agent", "Objection Agent", "Follow-Up Agent"] },
            { name: "Marketing", agents: ["Messaging Agent", "Content Agent", "Funnel Agent"] },
            { name: "Finance", agents: ["Cash Flow Agent", "Pricing Agent"] },
            { name: "Systems", agents: ["Automation Agent", "Tooling Agent"] },
            { name: "People", agents: ["Focus Agent", "Energy Agent"] },
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise Dream Team",
        price: 10000,
        priceDisplay: "$10K",
        agentCount: 38,
        humanEquivalent: "$4.6M",
        tagline: "This is unfair",
        description: "How do I build something big without burning out?",
        popular: false,
        departments: [
            { name: "Leadership", agents: ["CEO Agent", "Strategy Agent", "Risk Agent", "Priority Agent", "Long-Term Vision Agent"] },
            { name: "Execution", agents: ["Program Manager Agent", "Workflow Architect Agent", "Bottleneck Detector Agent", "SOP Agent", "QA Agent", "Execution Monitor Agent"] },
            { name: "Sales", agents: ["Sales Strategist Agent", "Pipeline Agent", "Objection Intelligence Agent", "Deal Review Agent", "Follow-Up Automation Agent", "Revenue Forecast Agent"] },
            { name: "Marketing", agents: ["Brand Agent", "Growth Experiments Agent", "Content Strategy Agent", "Distribution Agent", "Funnel Optimization Agent", "Analytics Agent"] },
            { name: "Finance", agents: ["CFO Agent", "Forecasting Agent", "Unit Economics Agent", "Capital Allocation Agent", "Exit / M&A Agent"] },
            { name: "Systems", agents: ["Automation Architect Agent", "AI Workflow Agent", "Data Agent", "Integration Agent", "Scalability Agent"] },
            { name: "People", agents: ["Hiring Agent", "Org Design Agent", "Leadership Coach Agent", "Burnout Prevention Agent", "Talent Optimization Agent"] },
        ],
    },
];

// Expandable Department Component
function DepartmentAccordion({ department, isExpanded, onToggle }: {
    department: { name: string; agents: string[] };
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border-b border-border-secondary last:border-b-0">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between py-2 text-left"
            >
                <span className="text-sm font-medium text-text-primary">
                    {department.name} <span className="text-text-tertiary">({department.agents.length})</span>
                </span>
                <ChevronDown className={cx(
                    "size-4 text-text-tertiary transition-transform",
                    isExpanded && "rotate-180"
                )} />
            </button>
            {isExpanded && (
                <ul className="pb-2 pl-3">
                    {department.agents.map((agent) => (
                        <li key={agent} className="flex items-center gap-2 py-0.5">
                            <div className="size-1 rounded-full bg-brand-500" />
                            <span className="text-xs text-text-secondary">{agent}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Agent Tier Card Component
function AgentTierCard({ tier }: { tier: typeof agentTiers[0] }) {
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

    const toggleDept = (deptName: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(deptName)) {
                next.delete(deptName);
            } else {
                next.add(deptName);
            }
            return next;
        });
    };

    return (
        <div
            className={cx(
                "relative flex flex-col rounded-2xl p-6",
                tier.popular
                    ? "bg-bg-primary ring-2 ring-brand-500 shadow-xl"
                    : "bg-bg-primary ring-1 ring-border-secondary shadow-md"
            )}
        >
            {/* Popular Badge */}
            {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge color="brand" type="modern" size="sm">
                        Most Popular
                    </Badge>
                </div>
            )}

            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
                <p className="mt-1 text-xs italic text-text-tertiary">"{tier.tagline}"</p>
            </div>

            {/* Price + Agent Count */}
            <div className="mb-2 flex items-end justify-between">
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-display-xs font-bold text-text-primary">
                            {tier.priceDisplay}
                        </span>
                        <span className="text-sm text-text-tertiary">/month</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-success-600">
                        ${Math.round(tier.price / tier.agentCount)}/agent/mo
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-display-xs font-bold text-brand-600">{tier.agentCount}</p>
                    <p className="text-xs text-text-tertiary">agents</p>
                </div>
            </div>

            {/* Human Comparison */}
            <p className="mb-4 text-xs text-text-tertiary">
                vs <span className="font-medium text-text-secondary">{tier.humanEquivalent}/year</span> in human salaries
            </p>

            {/* Description */}
            <p className="mb-4 rounded-lg bg-bg-secondary p-3 text-center text-xs font-medium text-text-secondary">
                {tier.description}
            </p>

            {/* Departments */}
            <div className="mb-4 flex-1 rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-text-quaternary">
                    7 Departments
                </p>
                {tier.departments.map((dept) => (
                    <DepartmentAccordion
                        key={dept.name}
                        department={dept}
                        isExpanded={expandedDepts.has(dept.name)}
                        onToggle={() => toggleDept(dept.name)}
                    />
                ))}
            </div>

            {/* CTA */}
            <PricingCTA
                tier={tier.id as "startup" | "teams" | "enterprise"}
                color={tier.popular ? "primary" : "secondary"}
                size="md"
                className="w-full"
            >
                Get Started
            </PricingCTA>
        </div>
    );
}

export function PricingContent() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            {/* Hero Section */}
            <section className="pt-12 pb-6 md:pt-16 md:pb-8">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                        <Badge color="brand" type="modern" size="sm">
                            Pricing
                        </Badge>
                        <h1 className="mt-4 text-display-sm font-semibold text-text-primary md:text-display-md">
                            Do you work with humans, AI, or both?
                        </h1>
                        <p className="mt-3 text-md text-text-tertiary md:text-lg">
                            Start with a workspace for your team. Add AI agents when you're ready to scale.
                        </p>
                    </div>
                </div>
            </section>

            {/* Workspace Pricing Section */}
            <section className="pb-16 md:pb-20">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    {/* Centered Header */}
                    <div className="mb-10 text-center">
                        <Button
                            color="secondary"
                            size="sm"
                            className="mb-4"
                            onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            No, I want AI agents →
                        </Button>
                        <h2 className="text-xl font-semibold text-text-primary">For Your Human Team</h2>
                        <p className="mt-1 text-sm text-text-tertiary">If you want humans working in the workspace, this is for you</p>
                    </div>

                    {/* Two Workspace Cards */}
                    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                        {workspacePlans.map((plan) => (
                            <div
                                key={plan.id}
                                className={cx(
                                    "relative flex flex-col rounded-2xl p-6",
                                    plan.popular
                                        ? "bg-bg-primary ring-2 ring-brand-500 shadow-lg"
                                        : "bg-bg-primary ring-1 ring-border-secondary shadow-md"
                                )}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                        <Badge color="brand" type="modern" size="sm">
                                            Best Value
                                        </Badge>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                                    <p className="mt-0.5 text-xs text-text-tertiary">{plan.subtext}</p>
                                </div>

                                {/* Pricing */}
                                <div className="mb-4 min-h-[52px]">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-display-xs font-bold text-text-primary">
                                            ${plan.price}
                                        </span>
                                        <span className="text-sm text-text-tertiary">{plan.period}</span>
                                    </div>
                                    {plan.savings && (
                                        <p className="mt-1 text-xs font-medium text-success-600">{plan.savings}</p>
                                    )}
                                </div>

                                {/* CTA Button */}
                                <PricingCTA
                                    plan={plan.id as "monthly" | "annual"}
                                    color={plan.popular ? "primary" : "secondary"}
                                    size="md"
                                    className="mb-5 w-full"
                                >
                                    Get Started
                                </PricingCTA>

                                {/* Features */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-text-secondary">INCLUDES</p>
                                    <ul className="space-y-1.5">
                                        {workspaceFeatures.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                                                <span className="text-xs text-text-secondary">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex items-center gap-4">
                    <hr className="flex-1 border-border-secondary" />
                    <span className="text-sm font-medium text-text-quaternary">ADD AI POWER</span>
                    <hr className="flex-1 border-border-secondary" />
                </div>
            </div>

            {/* Agent Pricing Section */}
            <section id="agents" className="py-16 md:py-20 scroll-mt-8">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    {/* Centered Header */}
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold text-text-primary">Your AI Team</h2>
                        <p className="mt-1 text-sm text-text-tertiary">DreamTeam doesn't scale features. It scales headcount.</p>
                    </div>

                    {/* Agent Count Comparison */}
                    <div className="mb-10 flex items-center justify-center gap-2 text-center">
                        <span className="text-2xl font-bold text-text-primary">7</span>
                        <span className="text-text-tertiary">→</span>
                        <span className="text-2xl font-bold text-text-primary">18</span>
                        <span className="text-text-tertiary">→</span>
                        <span className="text-2xl font-bold text-brand-600">38 agents</span>
                    </div>

                    <p className="mb-8 text-center text-sm text-text-tertiary">
                        Agent packages require an active Workspace subscription
                    </p>

                    {/* Agent Tier Cards */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {agentTiers.map((tier) => (
                            <AgentTierCard key={tier.id} tier={tier} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="bg-bg-secondary py-16 md:py-20">
                <div className="mx-auto max-w-container px-4 text-center md:px-8">
                    <h2 className="text-display-xs font-semibold text-text-primary md:text-display-sm">
                        Start with your workspace, add agents when ready
                    </h2>
                    <p className="mt-3 text-md text-text-tertiary">
                        Get your whole team on the same page.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <PricingCTA plan="annual" size="lg">
                            Get Started
                        </PricingCTA>
                        <Button href="/contact" color="secondary" size="lg">
                            Talk to Sales
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950">
                <div className="py-12 md:py-16">
                    <div className="mx-auto max-w-container px-4 md:px-8">
                        <div className="flex flex-col gap-12 md:gap-16 xl:flex-row">
                            <div className="flex flex-col items-start gap-6 md:w-80">
                                <DreamTeamLogo variant="white" />
                                <p className="text-md text-gray-400">
                                    Business in the AI era.
                                </p>
                            </div>
                            <nav className="flex-1">
                                <ul className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-4">
                                    {footerNavList.map((category) => (
                                        <li key={category.label}>
                                            <h4 className="text-sm font-semibold text-gray-400">{category.label}</h4>
                                            <ul className="mt-4 flex flex-col gap-3">
                                                {category.items.map((item) => (
                                                    <li key={item.label}>
                                                        <a href={item.href} className="text-md text-gray-300 transition-colors hover:text-white">
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
                <div className="border-t border-gray-800 py-8 md:py-10">
                    <div className="mx-auto max-w-container px-4 md:px-8">
                        <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
                            <p className="text-sm text-gray-500">© {new Date().getFullYear()} dreamteam.ai. All rights reserved.</p>
                            <ul className="flex gap-5">
                                {footerSocials.map(({ label, icon: Icon, href }) => (
                                    <li key={label}>
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-500 transition-colors hover:text-white"
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
        </div>
    );
}
