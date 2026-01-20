"use client";

import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            "w-full h-9 px-3 pr-9 bg-zinc-900 border border-zinc-800 rounded-lg appearance-none",
            "text-sm text-white cursor-pointer",
            "transition-colors duration-150",
            "hover:border-zinc-700",
            "focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600",
            "disabled:opacity-50 disabled:pointer-events-none",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = "Select";
