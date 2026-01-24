"use client";

import { type ElementType } from "react";
import { cx } from "@/lib/cx";

type FeaturedIconSize = "sm" | "md" | "lg" | "xl";
type FeaturedIconColor = "brand" | "gray" | "error" | "warning" | "success";
type FeaturedIconTheme = "light" | "dark" | "modern";

interface FeaturedIconProps {
    icon: ElementType;
    size?: FeaturedIconSize;
    color?: FeaturedIconColor;
    theme?: FeaturedIconTheme;
    className?: string;
}

const sizeClasses = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
    xl: "size-14",
};

const iconSizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-7",
};

const lightColorClasses = {
    brand: "bg-bg-brand-primary text-featured-icon-light-fg-brand",
    gray: "bg-bg-secondary text-featured-icon-light-fg-gray",
    error: "bg-bg-error-primary text-featured-icon-light-fg-error",
    warning: "bg-bg-warning-primary text-featured-icon-light-fg-warning",
    success: "bg-bg-success-primary text-featured-icon-light-fg-success",
};

const darkColorClasses = {
    brand: "bg-bg-brand-solid text-white",
    gray: "bg-bg-primary-solid text-white",
    error: "bg-bg-error-solid text-white",
    warning: "bg-bg-warning-solid text-white",
    success: "bg-bg-success-solid text-white",
};

const modernColorClasses = {
    brand: "bg-bg-primary text-fg-brand-primary border border-border-secondary shadow-xs",
    gray: "bg-bg-primary text-fg-secondary border border-border-secondary shadow-xs",
    error: "bg-bg-primary text-fg-error-primary border border-border-secondary shadow-xs",
    warning: "bg-bg-primary text-fg-warning-primary border border-border-secondary shadow-xs",
    success: "bg-bg-primary text-fg-success-primary border border-border-secondary shadow-xs",
};

export function FeaturedIcon({
    icon: Icon,
    size = "md",
    color = "brand",
    theme = "light",
    className,
}: FeaturedIconProps) {
    const themeClasses = {
        light: lightColorClasses,
        dark: darkColorClasses,
        modern: modernColorClasses,
    };

    return (
        <div
            className={cx(
                "flex items-center justify-center rounded-full",
                sizeClasses[size],
                themeClasses[theme][color],
                className
            )}
        >
            <Icon className={iconSizeClasses[size]} />
        </div>
    );
}

