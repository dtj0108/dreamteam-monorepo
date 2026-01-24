"use client";

import { cx } from "@/lib/cx";

interface SectionDividerProps {
    className?: string;
}

export function SectionDivider({ className }: SectionDividerProps) {
    return (
        <div className={cx("mx-auto max-w-container px-4 md:px-8", className)}>
            <div className="h-px w-full bg-border-secondary" />
        </div>
    );
}

