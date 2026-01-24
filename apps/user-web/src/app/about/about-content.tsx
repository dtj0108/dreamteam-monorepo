"use client";

import { Header } from "@/components/marketing/header-navigation/header";
import { FinanceBroLogo } from "@/components/foundations/logo/financebro-logo";
import { Button } from "@/components/base/buttons/button";

const HeroSection = () => {
    return (
        <section className="bg-bg-primary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="mb-3 text-sm font-semibold text-text-brand-secondary md:text-md">Nice to meet you</div>
                <div className="flex flex-col gap-x-16 lg:flex-row">
                    <h1 className="flex-1 text-display-md font-semibold text-text-primary md:text-display-lg">
                        Our mission is to help founders build businesses worth selling
                    </h1>
                    <p className="mt-4 w-full text-lg text-text-tertiary md:mt-6 md:text-xl lg:mt-3 lg:max-w-md">
                        dreamteam.ai is a financial platform built for founders who want clean books, clear metrics, and a path to exit.
                        We believe every business owner deserves to know what their company is worth.
                    </p>
                </div>
            </div>
        </section>
    );
};

const MetricsSection = () => {
    return (
        <section className="bg-bg-primary pb-16 md:pb-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <dl className="flex flex-col gap-8 rounded-2xl bg-bg-secondary p-8 md:flex-row md:p-16">
                    {[
                        { title: "500+", subtitle: "Businesses using dreamteam.ai" },
                        { title: "98%", subtitle: "AI categorization accuracy" },
                        { title: "$50M+", subtitle: "Revenue tracked" },
                    ].map((item, index) => (
                        <div key={index} className="flex flex-1 flex-col-reverse gap-3 text-center">
                            <dt className="text-lg font-semibold text-text-primary">{item.subtitle}</dt>
                            <dd className="text-display-lg font-semibold text-brand-600 md:text-display-xl">{item.title}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
};

const StorySection = () => {
    return (
        <section className="bg-bg-primary pb-16 md:pb-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="grid max-w-3xl">
                    <span className="text-sm font-semibold text-text-brand-secondary md:text-md">Our story</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-text-primary md:text-display-md">
                        We're building the financial OS for founders
                    </h2>
                    <p className="mt-4 text-lg text-text-tertiary md:mt-5 md:text-xl">
                        dreamteam.ai started from a simple frustration: why is it so hard to understand your own business finances?
                    </p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-2 md:gap-16">
                    <div className="space-y-4 text-md text-text-tertiary md:text-lg">
                        <p>
                            Like many founders, we spent hours every month trying to make sense of spreadsheets, bank statements,
                            and scattered financial data. We wanted to know simple things: Are we profitable? What are we spending
                            on software? What's our business actually worth?
                        </p>
                        <p>
                            The tools that could answer these questions cost hundreds of dollars a month and required a finance
                            degree to operate. So we built dreamteam.ai—a platform that imports your transactions, uses AI to
                            categorize everything, and gives you the metrics that actually matter.
                        </p>
                    </div>
                    <div className="space-y-4 text-md text-text-tertiary md:text-lg">
                        <p>
                            We built dreamteam.ai for founders like us: people who want to understand their business without
                            becoming accountants. Whether you're bootstrapped or funded, SaaS or services, we give you the
                            financial clarity you need to make better decisions.
                        </p>
                        <p>
                            And when you're ready to sell? dreamteam.ai shows you exactly what buyers will want to see—clean
                            books, clear KPIs, and a valuation you can defend. Because every founder deserves to know what
                            they've built is worth.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

const CTASection = () => {
    return (
        <section className="bg-bg-secondary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-display-sm font-semibold text-text-primary md:text-display-md">
                        Ready to get started?
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg text-text-tertiary md:mt-5 md:text-xl">
                        Join hundreds of founders who use dreamteam.ai to track their finances and plan their exit.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button href="/pricing" size="xl">
                            View pricing
                        </Button>
                        <Button href="/signup" color="secondary" size="xl">
                            Start free trial
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="border-t border-border-secondary bg-bg-secondary py-12">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <FinanceBroLogo />
                    <p className="text-sm text-text-tertiary">
                        © {new Date().getFullYear()} dreamteam.ai. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export function AboutContent() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />
            <HeroSection />
            <MetricsSection />
            <StorySection />
            <CTASection />
            <Footer />
        </div>
    );
}
