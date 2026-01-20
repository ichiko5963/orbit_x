"use client";

import { clsx } from "clsx";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg resize-none",
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

Textarea.displayName = "Textarea";
