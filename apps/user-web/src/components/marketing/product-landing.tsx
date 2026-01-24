"use client";

import { type FC, type ReactNode, type HTMLAttributes } from "react";
import { CheckCircle, PlayCircle } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Header } from "@/components/marketing/header-navigation/header";
import { SectionDivider } from "@/components/shared-assets/section-divider";
import { cx } from "@/lib/cx";
import { DreamTeamLogo } from "@/components/foundations/logo/dreamteam-logo";
import { GitHub, LinkedIn, X } from "@/components/foundations/social-icons";

// Types
export interface ProductFeature {
    title: string;
    description: string;
    bullets: string[];
    mockup: ReactNode;
    reverse?: boolean;
}

export interface ProductCapability {
    name: string;
    icon?: FC<{ className?: string }>;
    emoji?: string;
    description: string;
}

export interface ProductLandingProps {
    productName: string;
    productColor: string;
    badge: string;
    headline: string;
    subheadline: string;
    heroMockup: ReactNode;
    features: ProductFeature[];
    capabilities: ProductCapability[];
    ctaHeadline: string;
    ctaSubheadline: string;
}

// Shared components
const FeatureMockup: FC<HTMLAttributes<HTMLDivElement>> = (props) => {
    return (
        <div className={cx("w-full rounded-xl bg-bg-primary p-3 shadow-lg ring-1 ring-border-secondary md:p-4", props.className)}>
            <div className="rounded-lg bg-bg-secondary p-4 ring-1 ring-border-tertiary md:p-6">
                {props.children}
            </div>
        </div>
    );
};

const CheckItemText = ({ text, size = "md" }: { text: string; size?: "sm" | "md" | "lg" }) => {
    return (
        <li className="flex gap-3">
            <CheckCircle
                className={cx(
                    "shrink-0 text-fg-brand-primary",
                    size === "lg" ? "size-6 md:size-7" : size === "md" ? "size-6" : "size-5"
                )}
            />
            <span className={cx("text-text-tertiary", size === "lg" ? "text-md md:text-lg" : size === "md" ? "text-md" : "text-sm")}>
                {text}
            </span>
        </li>
    );
};

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
            { label: "CRM", href: "/products/crm" },
            { label: "Team", href: "/products/team" },
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

// Hero Section
function HeroSection({ 
    productName, 
    productColor, 
    badge, 
    headline, 
    subheadline, 
    heroMockup 
}: Pick<ProductLandingProps, "productName" | "productColor" | "badge" | "headline" | "subheadline" | "heroMockup">) {
    return (
        <div className="relative overflow-hidden bg-bg-secondary_alt">
            {/* Background pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/50 via-transparent to-transparent" />

            <Header />

            <section className="relative overflow-hidden py-16 md:py-24">
                <div className="mx-auto w-full max-w-container px-4 md:px-8">
                    <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                        <Badge color="brand" type="modern" size="md" className="mb-4">
                            {badge}
                        </Badge>
                        <h1 className="text-display-md font-semibold text-text-primary md:text-display-lg lg:text-display-xl">
                            {headline}
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg text-text-tertiary md:mt-6 md:text-xl">
                            {subheadline}
                        </p>
                        <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-12">
                            <Button href="/demo" iconLeading={PlayCircle} color="secondary" size="xl">
                                Try Demo
                            </Button>
                            <Button href="/signup" size="xl">
                                Start Free Trial
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hero Mockup */}
                <div className="mx-auto mt-12 w-full max-w-4xl px-4 md:mt-16 md:px-8">
                    {heroMockup}
                </div>
            </section>
        </div>
    );
}

// Features Section
function FeaturesSection({ features, productName }: { features: ProductFeature[]; productName: string }) {
    return (
        <section id="features" className="flex flex-col gap-16 overflow-hidden bg-bg-primary py-16 md:gap-24 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                    <span className="text-sm font-semibold text-text-brand-secondary md:text-md">Features</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-text-primary md:text-display-md">
                        Everything you need in {productName}
                    </h2>
                    <p className="mt-4 text-lg text-text-tertiary md:mt-5 md:text-xl">
                        Powerful features designed to help your team succeed.
                    </p>
                </div>
            </div>

            <div className="mx-auto flex w-full max-w-container flex-col gap-16 px-4 md:gap-24 md:px-8">
                {features.map((feature, index) => (
                    <div 
                        key={feature.title} 
                        className={cx(
                            "grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16",
                            feature.reverse && "lg:[&>*:first-child]:order-last"
                        )}
                    >
                        <div className="flex max-w-xl flex-col justify-center">
                            <h2 className="text-display-xs font-semibold text-text-primary md:text-display-sm">
                                {feature.title}
                            </h2>
                            <p className="mt-3 text-md text-text-tertiary md:text-lg">
                                {feature.description}
                            </p>
                            <ul className="mt-6 flex flex-col gap-4 md:mt-8">
                                {feature.bullets.map((bullet) => (
                                    <CheckItemText key={bullet} size="md" text={bullet} />
                                ))}
                            </ul>
                        </div>
                        <FeatureMockup>
                            {feature.mockup}
                        </FeatureMockup>
                    </div>
                ))}
            </div>
        </section>
    );
}

// Capabilities Section
function CapabilitiesSection({ capabilities, productName }: { capabilities: ProductCapability[]; productName: string }) {
    return (
        <section className="bg-bg-secondary py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center gap-12 md:gap-16">
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                        <span className="text-sm font-semibold text-text-brand-secondary md:text-md">Capabilities</span>
                        <h2 className="mt-3 text-display-sm font-semibold text-text-primary md:text-display-md">
                            {productName} at a glance
                        </h2>
                        <p className="mt-4 text-lg text-text-tertiary md:mt-5 md:text-xl">
                            Everything you need, all in one place.
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
                        {capabilities.map(({ name, icon: Icon, emoji, description }) => (
                            <div
                                key={name}
                                className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl bg-bg-primary p-4 text-center shadow-sm ring-1 ring-border-secondary transition-shadow hover:shadow-md"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                    {emoji ? <span className="text-xl">{emoji}</span> : Icon && <Icon className="size-5" />}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-semibold leading-tight text-text-primary">{name}</span>
                                    <span className="text-xs leading-tight text-text-tertiary">{description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// CTA Section
function CTASection({ headline, subheadline }: { headline: string; subheadline: string }) {
    return (
        <section className="bg-bg-primary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col gap-8 rounded-2xl bg-bg-secondary px-6 py-10 lg:flex-row lg:items-center lg:gap-12 lg:p-16">
                    <div className="flex max-w-3xl flex-1 flex-col">
                        <h2 className="text-display-sm font-semibold text-text-primary md:text-display-md">
                            {headline}
                        </h2>
                        <p className="mt-4 text-lg text-text-tertiary md:mt-5 lg:text-xl">
                            {subheadline}
                        </p>
                    </div>
                    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start">
                        <Button color="secondary" size="xl" href="/demo">
                            Try Demo
                        </Button>
                        <Button href="/signup" size="xl">
                            Start free trial
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    return (
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
                        <p className="text-sm text-gray-500">© 2024 dreamteam.ai. All rights reserved.</p>
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
    );
}

// Main Product Landing Component
export function ProductLanding({
    productName,
    productColor,
    badge,
    headline,
    subheadline,
    heroMockup,
    features,
    capabilities,
    ctaHeadline,
    ctaSubheadline,
}: ProductLandingProps) {
    return (
        <div className="bg-bg-primary">
            <HeroSection
                productName={productName}
                productColor={productColor}
                badge={badge}
                headline={headline}
                subheadline={subheadline}
                heroMockup={heroMockup}
            />
            <SectionDivider />
            <FeaturesSection features={features} productName={productName} />
            <CapabilitiesSection capabilities={capabilities} productName={productName} />
            <CTASection headline={ctaHeadline} subheadline={ctaSubheadline} />
            <Footer />
        </div>
    );
}

export default ProductLanding;

