"use client";

import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg",
          "text-sm text-white placeholder:text-zinc-600",
          "transition-colors duration-150",
          "hover:border-zinc-700",
          "focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600",
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
