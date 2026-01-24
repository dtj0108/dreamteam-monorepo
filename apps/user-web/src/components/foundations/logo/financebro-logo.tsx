"use client";

import { cx } from "@/lib/cx";
import { Rocket02 } from "@untitledui/icons";

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export function FinanceBroLogo({ className, showText = true }: LogoProps) {
    return (
        <div className={cx("flex items-center gap-2.5", className)}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600">
                <Rocket02 className="size-5 text-white" />
            </div>
            {showText && (
                <span className="text-xl font-bold text-text-primary">
                    dreamteam.ai
                </span>
            )}
        </div>
    );
}

// Aliases for compatibility
export const ExitGoalsLogo = FinanceBroLogo;
export const UntitledLogo = FinanceBroLogo;
