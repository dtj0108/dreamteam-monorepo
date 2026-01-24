"use client";

import { forwardRef, type ComponentProps, type ElementType, type ReactNode } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { cx } from "@/lib/cx";

type ButtonColor = "primary" | "secondary" | "tertiary" | "link-color" | "link-gray" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface ButtonProps {
    children?: ReactNode;
    className?: string;
    color?: ButtonColor;
    size?: ButtonSize;
    iconLeading?: ElementType;
    iconTrailing?: ReactNode;
    href?: string;
    isDisabled?: boolean;
    type?: "button" | "submit" | "reset";
    onClick?: () => void;
    "aria-label"?: string;
}

const buttonStyles = {
    base: "inline-flex items-center justify-center font-semibold transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring disabled:opacity-50 disabled:cursor-not-allowed",
    color: {
        primary: "bg-bg-brand-solid text-white hover:bg-bg-brand-solid_hover shadow-xs",
        secondary: "bg-white text-fg-secondary border border-border-primary hover:bg-bg-primary_hover shadow-xs",
        tertiary: "text-fg-tertiary hover:text-fg-secondary hover:bg-bg-primary_hover",
        "link-color": "text-fg-brand-primary hover:text-fg-brand-secondary underline-offset-4",
        "link-gray": "text-fg-tertiary hover:text-fg-secondary",
        destructive: "bg-bg-error-solid text-white hover:bg-error-700 shadow-xs",
    },
    size: {
        sm: "gap-1.5 px-3 py-2 text-sm rounded-lg",
        md: "gap-1.5 px-3.5 py-2.5 text-sm rounded-lg",
        lg: "gap-2 px-4 py-2.5 text-md rounded-lg",
        xl: "gap-2 px-5 py-3 text-md rounded-lg",
        "2xl": "gap-2.5 px-6 py-4 text-lg rounded-xl",
    },
    iconSize: {
        sm: "size-4",
        md: "size-5",
        lg: "size-5",
        xl: "size-5",
        "2xl": "size-6",
    },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps & ComponentProps<typeof AriaButton>>(
    (
        {
            children,
            className,
            color = "primary",
            size = "md",
            iconLeading: IconLeading,
            iconTrailing,
            href,
            isDisabled,
            type = "button",
            onClick,
            ...props
        },
        ref
    ) => {
        const classes = cx(
            buttonStyles.base,
            buttonStyles.color[color],
            buttonStyles.size[size],
            className
        );

        const iconClass = buttonStyles.iconSize[size];

        const content = (
            <>
                {IconLeading && <IconLeading className={iconClass} />}
                {children}
                {iconTrailing}
            </>
        );

        if (href) {
            return (
                <AriaLink href={href} className={classes} {...(props as any)}>
                    {content}
                </AriaLink>
            );
        }

        return (
            <AriaButton
                ref={ref}
                type={type}
                className={classes}
                isDisabled={isDisabled}
                onPress={onClick}
                {...props}
            >
                {content}
            </AriaButton>
        );
    }
);

Button.displayName = "Button";

