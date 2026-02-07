"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ChevronDown } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { DreamTeamLogo } from "@/components/foundations/logo/dreamteam-logo";
import { cx } from "@/lib/cx";

const products = [
    {
        name: "Finance",
        description: "Bookkeeping, reports & valuation",
        href: "/products/finance",
        emoji: "💰",
    },
    {
        name: "Sales",
        description: "Pipeline, leads & deals",
        href: "/products/crm",
        emoji: "🤝",
    },
    {
        name: "Team",
        description: "Messaging & collaboration",
        href: "/products/team",
        emoji: "💬",
    },
    {
        name: "Projects",
        description: "Tasks, milestones & timelines",
        href: "/products/projects",
        emoji: "📋",
    },
    {
        name: "Knowledge",
        description: "Docs, templates & wikis",
        href: "/products/knowledge",
        emoji: "📚",
    },
];

const navItems = [
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
];

interface HeaderProps {
    variant?: "light" | "dark";
}

export function Header({ variant = "light" }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);

    const isDark = variant === "dark";

    return (
        <header className="relative z-50">
            <nav className="mx-auto flex max-w-container items-center justify-between px-4 py-4 md:px-8 md:py-5">
                {/* Logo */}
                <Link href="/" className="flex items-center">
                    <DreamTeamLogo variant={isDark ? "white" : "default"} />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-8 lg:flex">
                    <ul className="flex items-center gap-8">
                        {/* Products Dropdown */}
                        <li className="relative">
                            <button
                                type="button"
                                className={cx(
                                    "flex items-center gap-1.5 text-md font-semibold transition-colors",
                                    isDark 
                                        ? "text-slate-400 hover:text-white" 
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                                onMouseEnter={() => setProductsOpen(true)}
                                onMouseLeave={() => setProductsOpen(false)}
                                onClick={() => setProductsOpen(!productsOpen)}
                            >
                                Products
                                <ChevronDown className={cx(
                                    "size-4 transition-transform duration-200",
                                    productsOpen && "rotate-180"
                                )} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            <div
                                className={cx(
                                    "absolute left-1/2 top-full pt-4 -translate-x-1/2 transition-all duration-200",
                                    productsOpen ? "visible opacity-100" : "invisible opacity-0"
                                )}
                                onMouseEnter={() => setProductsOpen(true)}
                                onMouseLeave={() => setProductsOpen(false)}
                            >
                                <div className={cx(
                                    "w-80 rounded-xl border p-2 shadow-xl",
                                    isDark 
                                        ? "border-slate-700 bg-slate-900" 
                                        : "border-gray-200 bg-white"
                                )}>
                                    {products.map((product) => (
                                        <Link
                                            key={product.name}
                                            href={product.href}
                                            className={cx(
                                                "flex items-start gap-3 rounded-lg p-3 transition-colors",
                                                isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"
                                            )}
                                            onClick={() => setProductsOpen(false)}
                                        >
                                            <div className={cx(
                                                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                                                isDark ? "bg-slate-800" : "bg-gray-100"
                                            )}>
                                                <span className="text-xl">{product.emoji}</span>
                                            </div>
                                            <div>
                                                <p className={cx(
                                                    "font-semibold",
                                                    isDark ? "text-white" : "text-gray-900"
                                                )}>{product.name}</p>
                                                <p className={cx(
                                                    "text-sm",
                                                    isDark ? "text-slate-400" : "text-gray-500"
                                                )}>{product.description}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </li>
                        
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={cx(
                                        "text-md font-semibold transition-colors",
                                        isDark 
                                            ? "text-slate-400 hover:text-white" 
                                            : "text-gray-600 hover:text-gray-900"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Desktop CTA Buttons */}
                <div className="hidden items-center gap-3 lg:flex">
                    <Button 
                        href="/login" 
                        color="tertiary" 
                        size="lg" 
                        className={isDark ? "text-slate-300 hover:text-white" : ""}
                    >
                        Log in
                    </Button>
                    <Button
                        href="/pricing"
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Get Started
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="lg:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? (
                        <X className={cx("size-6", isDark ? "text-white" : "text-gray-900")} />
                    ) : (
                        <Menu className={cx("size-6", isDark ? "text-white" : "text-gray-900")} />
                    )}
                </button>
            </nav>

            {/* Mobile Menu */}
            <div
                className={cx(
                    "absolute left-0 right-0 top-full z-50 shadow-lg transition-all duration-200 lg:hidden",
                    isDark ? "bg-slate-900" : "bg-white",
                    mobileMenuOpen ? "visible opacity-100" : "invisible opacity-0"
                )}
            >
                <div className="mx-auto max-w-container px-4 py-6 md:px-8">
                    {/* Products Section */}
                    <div className="mb-4">
                        <p className={cx(
                            "mb-3 text-sm font-semibold uppercase tracking-wider",
                            isDark ? "text-slate-500" : "text-gray-400"
                        )}>Products</p>
                        <div className="space-y-2">
                            {products.map((product) => (
                                <Link
                                    key={product.name}
                                    href={product.href}
                                    className={cx(
                                        "flex items-center gap-3 rounded-lg p-2 transition-colors",
                                        isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <div className={cx(
                                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                        isDark ? "bg-slate-800" : "bg-gray-100"
                                    )}>
                                        <span className="text-lg">{product.emoji}</span>
                                    </div>
                                    <div>
                                        <p className={cx(
                                            "font-semibold",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>{product.name}</p>
                                        <p className={cx(
                                            "text-xs",
                                            isDark ? "text-slate-400" : "text-gray-500"
                                        )}>{product.description}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                    
                    <hr className={cx("my-4", isDark ? "border-slate-700" : "border-gray-200")} />
                    
                    <ul className="flex flex-col gap-2">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={cx(
                                        "block py-2 text-lg font-semibold",
                                        isDark 
                                            ? "text-slate-300 hover:text-white" 
                                            : "text-gray-700 hover:text-gray-900"
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 flex flex-col gap-3">
                        <Button 
                            href="/login" 
                            color="secondary" 
                            size="lg" 
                            className={cx(
                                "w-full",
                                isDark && "border-slate-700 bg-slate-800 text-white"
                            )}
                        >
                            Log in
                        </Button>
                        <Button href="/pricing" size="lg" className="w-full bg-blue-600">
                            Get Started
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
