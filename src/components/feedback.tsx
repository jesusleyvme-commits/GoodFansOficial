import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type Feedback = { kind: "error" | "success"; text: string } | null;

export function Feedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  const Icon = feedback.kind === "error" ? AlertCircle : CheckCircle2;

  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 text-sm",
        feedback.kind === "error" ? "text-red-300" : "text-emerald-300",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{feedback.text}</span>
    </p>
  );
}
