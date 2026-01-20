"use client";

import { clsx } from "clsx";
import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "tier-s" | "tier-a" | "tier-b" | "tier-c" | "success" | "warning" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-md",
          {
            "bg-zinc-800 text-zinc-400": variant === "default",
            "tier-s": variant === "tier-s",
            "tier-a": variant === "tier-a",
            "tier-b": variant === "tier-b",
            "tier-c": variant === "tier-c",
            "bg-emerald-500/10 text-emerald-400": variant === "success",
            "bg-amber-500/10 text-amber-400": variant === "warning",
            "bg-blue-500/10 text-blue-400": variant === "info",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
