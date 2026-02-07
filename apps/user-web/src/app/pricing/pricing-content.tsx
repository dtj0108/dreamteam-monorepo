"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Clock, Loader2 } from "lucide-react";
import { Header } from "@/components/marketing/header-navigation/header";
import { DreamTeamLogo } from "@/components/foundations/logo/dreamteam-logo";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { GitHub, LinkedIn, X } from "@/components/foundations/social-icons";
import { cx } from "@/lib/cx";
import { PricingCTA } from "@/components/billing/pricing-cta";

// Types for API response
interface PlanDisplayConfig {
    tagline?: string;
    badge_text?: string;
    human_equivalent?: string;
    agent_count?: number;
    savings_text?: string;
    departments?: Array<{
        name: string;
        agents: string[];
    }>;
}

interface PublicPlan {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    plan_type: 'workspace_plan' | 'agent_tier' | null;
    price_monthly: number | null;
    price_yearly: number | null;
    features: string[];
    is_coming_soon: boolean;
    display_config: PlanDisplayConfig;
}

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

// Default workspace features (used when API fails to load)
const defaultWorkspaceFeatures = [
    "All 5 products (Finance, Sales, Team, Projects, Knowledge)",
    "Unlimited accounts & transactions",
    "Analytics & reporting",
    "100 GB storage",
    "Up to 10 users included",
    "+$10/mo per additional user",
    "Priority support",
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

// Display tier type for dynamic data
interface DisplayAgentTier {
    id: string;
    name: string;
    price: number;
    priceDisplay: string;
    agentCount: number;
    humanEquivalent: string;
    tagline: string;
    description: string;
    popular: boolean;
    departments: Array<{ name: string; agents: string[] }>;
    isComingSoon: boolean;
}

// Agent Tier Card Component
function AgentTierCard({ tier }: { tier: DisplayAgentTier }) {
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
                tier.popular && !tier.isComingSoon
                    ? "bg-bg-primary ring-2 ring-brand-500 shadow-xl"
                    : "bg-bg-primary ring-1 ring-border-secondary shadow-md"
            )}
        >
            {/* Popular/Coming Soon Badge */}
            {tier.isComingSoon ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge color="gray" type="modern" size="sm" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="mr-1 size-3" />
                        Coming Soon
                    </Badge>
                </div>
            ) : tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge color="brand" type="modern" size="sm">
                        Most Popular
                    </Badge>
                </div>
            )}

            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
                {tier.tagline && (
                    <p className="mt-1 text-xs italic text-text-tertiary">"{tier.tagline}"</p>
                )}
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
                    {tier.price > 0 && tier.agentCount > 0 && (
                        <p className="mt-1 text-xs font-medium text-success-600">
                            ${Math.round(tier.price / tier.agentCount)}/agent/mo
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-display-xs font-bold text-brand-600">{tier.agentCount}</p>
                    <p className="text-xs text-text-tertiary">agents</p>
                </div>
            </div>

            {/* Human Comparison */}
            {tier.humanEquivalent && (
                <p className="mb-4 text-xs text-text-tertiary">
                    vs <span className="font-medium text-text-secondary">{tier.humanEquivalent}/year</span> in human salaries
                </p>
            )}

            {/* Description */}
            {tier.description && (
                <p className="mb-4 rounded-lg bg-bg-secondary p-3 text-center text-xs font-medium text-text-secondary">
                    {tier.description}
                </p>
            )}

            {/* Departments */}
            {tier.departments.length > 0 && (
                <div className="mb-4 flex-1 rounded-lg bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-text-quaternary">
                        {tier.departments.length} Departments
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
            )}

            {/* CTA */}
            <PricingCTA
                tier={tier.id as "startup" | "teams" | "enterprise"}
                color={tier.popular && !tier.isComingSoon ? "primary" : "secondary"}
                size="md"
                className="w-full"
                isComingSoon={tier.isComingSoon}
            >
                {tier.isComingSoon ? (
                    <span className="flex items-center justify-center gap-2">
                        <span>⏳</span> Coming Soon
                    </span>
                ) : "Get Started"}
            </PricingCTA>
        </div>
    );
}

export function PricingContent() {
    // State for fetched plans
    const [fetchedWorkspacePlans, setFetchedWorkspacePlans] = useState<PublicPlan[]>([]);
    const [fetchedAgentTiers, setFetchedAgentTiers] = useState<PublicPlan[]>([]);
    const [plansLoaded, setPlansLoaded] = useState(false);

    // Fetch plans from API
    useEffect(() => {
        async function fetchPlans() {
            try {
                const res = await fetch('/api/plans');
                if (res.ok) {
                    const data = await res.json();
                    const plans: PublicPlan[] = data.plans || [];

                    // Split by plan type
                    setFetchedWorkspacePlans(plans.filter(p => p.plan_type === 'workspace_plan'));
                    setFetchedAgentTiers(plans.filter(p => p.plan_type === 'agent_tier'));
                }
            } catch (error) {
                console.error('Failed to fetch plans:', error);
                // Will fall back to hardcoded data
            } finally {
                setPlansLoaded(true);
            }
        }
        fetchPlans();
    }, []);

    // Transform API plans to display format
    const displayWorkspacePlans = fetchedWorkspacePlans.map(plan => ({
        id: plan.slug,
        name: plan.name,
        price: plan.price_monthly ? plan.price_monthly / 100 : 0,
        period: "/month" as const,
        subtext: plan.slug === 'annual'
            ? `$${plan.price_yearly ? plan.price_yearly / 100 : 0}/year, billed annually`
            : "Billed monthly",
        popular: plan.display_config.badge_text === 'Best Value',
        savings: plan.display_config.savings_text || (plan.slug === 'monthly' ? "Cancel anytime" : ""),
        isComingSoon: plan.is_coming_soon,
        features: plan.features,
    }));

    const displayAgentTiers = fetchedAgentTiers.map(plan => ({
        id: plan.slug,
        name: plan.name,
        price: plan.price_monthly ? plan.price_monthly / 100 : 0,
        priceDisplay: plan.price_monthly ? `$${Math.round(plan.price_monthly / 100 / 1000)}K` : "$0",
        agentCount: plan.display_config.agent_count || 0,
        humanEquivalent: plan.display_config.human_equivalent || "",
        tagline: plan.display_config.tagline || "",
        description: plan.description || "",
        popular: plan.display_config.badge_text === 'Most Popular',
        departments: plan.display_config.departments || [],
        isComingSoon: plan.is_coming_soon,
    }));

    // Use fetched features or fallback to defaults
    const displayWorkspaceFeatures = fetchedWorkspacePlans.length > 0 && fetchedWorkspacePlans[0]?.features.length > 0
        ? fetchedWorkspacePlans[0].features
        : defaultWorkspaceFeatures;

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
                        {!plansLoaded ? (
                            // Loading skeletons
                            <>
                                {[1, 2].map((i) => (
                                    <div key={i} className="relative flex flex-col rounded-2xl p-6 bg-bg-primary ring-1 ring-border-secondary shadow-md animate-pulse">
                                        <div className="h-6 w-24 bg-gray-200 rounded mb-2" />
                                        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                                        <div className="h-10 w-20 bg-gray-200 rounded mb-4" />
                                        <div className="h-10 w-full bg-gray-200 rounded mb-5" />
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4, 5].map((j) => (
                                                <div key={j} className="h-4 bg-gray-200 rounded w-full" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : displayWorkspacePlans.length === 0 ? (
                            // No plans loaded - show message
                            <div className="col-span-2 text-center py-8 text-text-tertiary">
                                <p>Pricing plans are being configured. Please check back soon.</p>
                            </div>
                        ) : displayWorkspacePlans.map((plan) => (
                            <div
                                key={plan.id}
                                className={cx(
                                    "relative flex flex-col rounded-2xl p-6",
                                    plan.popular
                                        ? "bg-bg-primary ring-2 ring-brand-500 shadow-lg"
                                        : "bg-bg-primary ring-1 ring-border-secondary shadow-md"
                                )}
                            >
                                {/* Popular/Coming Soon Badge */}
                                {plan.isComingSoon ? (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                        <Badge color="gray" type="modern" size="sm" className="bg-amber-50 text-amber-700 border-amber-200">
                                            <Clock className="mr-1 size-3" />
                                            Coming Soon
                                        </Badge>
                                    </div>
                                ) : plan.popular && (
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
                                    isComingSoon={plan.isComingSoon}
                                >
                                    {plan.isComingSoon ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span>⏳</span> Coming Soon
                                        </span>
                                    ) : "Get Started"}
                                </PricingCTA>

                                {/* Features */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-text-secondary">INCLUDES</p>
                                    <ul className="space-y-1.5">
                                        {displayWorkspaceFeatures.map((feature, index) => (
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
                    {plansLoaded && displayAgentTiers.length >= 3 && (
                        <div className="mb-10 flex items-center justify-center gap-2 text-center">
                            <span className="text-2xl font-bold text-text-primary">{displayAgentTiers[0]?.agentCount || 7}</span>
                            <span className="text-text-tertiary">→</span>
                            <span className="text-2xl font-bold text-text-primary">{displayAgentTiers[1]?.agentCount || 18}</span>
                            <span className="text-text-tertiary">→</span>
                            <span className="text-2xl font-bold text-brand-600">{displayAgentTiers[2]?.agentCount || 38} agents</span>
                        </div>
                    )}

                    <p className="mb-8 text-center text-lg italic text-text-tertiary">
                        Startup package customers get early access to new agent packages
                    </p>

                    {/* Agent Tier Cards */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {!plansLoaded ? (
                            // Loading skeletons for agent tiers
                            <>
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="relative flex flex-col rounded-2xl p-6 bg-bg-primary ring-1 ring-border-secondary shadow-md animate-pulse">
                                        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
                                        <div className="h-10 w-20 bg-gray-200 rounded mb-2" />
                                        <div className="h-8 w-16 bg-gray-200 rounded mb-4" />
                                        <div className="h-20 bg-gray-200 rounded mb-4" />
                                        <div className="flex-1 space-y-2">
                                            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                                                <div key={j} className="h-4 bg-gray-200 rounded w-full" />
                                            ))}
                                        </div>
                                        <div className="h-10 w-full bg-gray-200 rounded mt-4" />
                                    </div>
                                ))}
                            </>
                        ) : displayAgentTiers.length === 0 ? (
                            // No plans loaded - show message
                            <div className="col-span-3 text-center py-8 text-text-tertiary">
                                <p>Agent tiers are being configured. Please check back soon.</p>
                            </div>
                        ) : (
                            displayAgentTiers.map((tier) => (
                                <AgentTierCard key={tier.id} tier={tier} />
                            ))
                        )}
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
