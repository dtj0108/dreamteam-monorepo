"use client";

import { cx } from "@/lib/cx";

interface DreamTeamLogoProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    variant?: "default" | "white";
}

export function DreamTeamLogo({ 
    className, 
    size = "md",
    variant = "default" 
}: DreamTeamLogoProps) {
    const textSizeClasses = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
    };

    return (
        <span className={cx(
            "font-bold tracking-tight",
            textSizeClasses[size],
            variant === "white" ? "text-white" : "text-gray-900",
            className
        )}>
            dreamteam.ai
        </span>
    );
}
