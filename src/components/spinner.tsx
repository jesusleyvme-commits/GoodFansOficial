import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-4 shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin-slow",
        className,
      )}
    />
  );
}
