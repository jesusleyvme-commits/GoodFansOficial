import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-input border border-border bg-input px-4 text-sm text-foreground transition-colors duration-200",
        "placeholder:text-muted-foreground/70 hover:border-white/15 focus:border-brand-500 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
