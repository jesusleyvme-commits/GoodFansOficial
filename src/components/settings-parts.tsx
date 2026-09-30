import type { ReactNode } from "react";

import { Card } from "@/components/card";
import { cn } from "@/lib/utils";

type SettingsCardProps = {
  /** Âncora usada pela navegação para rolar até esta seção. */
  id: string;
  title: string;
  description: string;
  /** Ícone da seção, para o usuário achar rápido o bloco que procura. */
  icon: ReactNode;
  /** Destaca a seção que a navegação considera atual. */
  active?: boolean;
  children: ReactNode;
};

export function SettingsCard({
  id,
  title,
  description,
  icon,
  active = false,
  children,
}: SettingsCardProps) {
  return (
    <Card
      id={id}
      // O scroll-mt abre espaço para o header e a barra de navegação grudados no
      // topo, senão o clique num item joga o título embaixo deles.
      className={cn(
        "animate-fade-in scroll-mt-32 transition-shadow duration-200",
        active && "ring-1 ring-brand-500/40",
      )}
    >
      <div className="mb-6 flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-input border border-white/10 bg-white/[0.04] transition-colors",
            active ? "text-brand-300" : "text-brand-400",
          )}
        >
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {children}
    </Card>
  );
}

type SettingsFieldProps = {
  label: string;
  htmlFor: string;
  /** Texto de apoio abaixo do campo. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Label + dica + espaçamento, para os formulários ficarem iguais sem repetir. */
export function SettingsField({ label, htmlFor, hint, children, className }: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground/90">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
