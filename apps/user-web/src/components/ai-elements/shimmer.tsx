"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type ShimmerProps = ComponentProps<"span"> & {
  duration?: number;
};

export const Shimmer = ({
  className,
  duration = 1,
  children,
  ...props
}: ShimmerProps) => {
  return (
    <span
      className={cn(
        "inline-block animate-pulse bg-gradient-to-r from-current via-muted-foreground/50 to-current bg-clip-text",
        className
      )}
      style={{
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

