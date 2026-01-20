"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import { InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={clsx(
          "inline-flex items-center gap-2.5 cursor-pointer select-none group",
          props.disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={clsx(
              "w-4 h-4 rounded border transition-all duration-150",
              "group-hover:border-zinc-600",
              checked
                ? "bg-white border-white"
                : "bg-transparent border-zinc-700"
            )}
          >
            {checked && <Check className="w-full h-full p-0.5 text-zinc-900" strokeWidth={3} />}
          </div>
        </div>
        {label && <span className="text-sm text-zinc-300">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
