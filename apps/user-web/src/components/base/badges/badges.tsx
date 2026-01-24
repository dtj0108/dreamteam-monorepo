"use client";

import { type ReactNode } from "react";
import { cx } from "@/lib/cx";

type BadgeColor = "gray" | "brand" | "error" | "warning" | "success";
type BadgeType = "pill" | "modern" | "outline";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
    children: ReactNode;
    color?: BadgeColor;
    type?: BadgeType;
    size?: BadgeSize;
    className?: string;
    iconLeading?: ReactNode;
    iconTrailing?: ReactNode;
}

const colorStyles = {
    pill: {
        gray: "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
        brand: "bg-utility-brand-50 text-utility-brand-700 ring-utility-brand-200",
        error: "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
        warning: "bg-utility-warning-50 text-utility-warning-700 ring-utility-warning-200",
        success: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    },
    modern: {
        gray: "bg-utility-gray-50 text-utility-gray-700 border-utility-gray-200",
        brand: "bg-utility-brand-50 text-utility-brand-700 border-utility-brand-200",
        error: "bg-utility-error-50 text-utility-error-700 border-utility-error-200",
        warning: "bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200",
        success: "bg-utility-success-50 text-utility-success-700 border-utility-success-200",
    },
    outline: {
        gray: "bg-transparent text-utility-gray-700 border-utility-gray-300",
        brand: "bg-transparent text-utility-brand-700 border-utility-brand-300",
        error: "bg-transparent text-utility-error-700 border-utility-error-300",
        warning: "bg-transparent text-utility-warning-700 border-utility-warning-300",
        success: "bg-transparent text-utility-success-700 border-utility-success-300",
    },
};

const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-sm",
};

export function Badge({
    children,
    color = "gray",
    type = "pill",
    size = "sm",
    className,
    iconLeading,
    iconTrailing,
}: BadgeProps) {
    const baseStyles = "inline-flex items-center gap-1 font-medium rounded-full";
    const borderStyles = type === "pill" ? "ring-1 ring-inset" : "border";

    return (
        <span
            className={cx(
                baseStyles,
                borderStyles,
                colorStyles[type][color],
                sizeStyles[size],
                className
            )}
        >
            {iconLeading}
            {children}
            {iconTrailing}
        </span>
    );
}

