import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-brand text-white shadow-button hover:brightness-110 active:brightness-95",
  secondary:
    "border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] active:bg-white/[0.06]",
  ghost: "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
  danger:
    "border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:bg-red-500/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  /** Renderiza o estilo do botão em outro elemento, como um <Link>. */
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-input font-semibold whitespace-nowrap transition-[filter,background-color,opacity] duration-200 select-none",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
