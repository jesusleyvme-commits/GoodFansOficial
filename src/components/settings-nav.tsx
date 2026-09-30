import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type SettingsSection = {
  id: string;
  label: string;
};

type SettingsNavProps = {
  sections: readonly SettingsSection[];
  /** Seção que está no topo da tela agora. */
  active: string;
  onActiveChange: (id: string) => void;
};

/**
 * Barra de seções grudada no topo. Em vez de tabs, ela rola a página: assim a
 * página inteira continua acessível por busca e por readers de tela, e o item
 * ativo acompanha a rolagem.
 */
export function SettingsNav({ sections, active, onActiveChange }: SettingsNavProps) {
  // Referência às âncoras evita consultar o DOM a cada mousemove do scroll.
  const nodes = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const seen = new Map<string, IntersectionObserver>();

    for (const { id } of sections) {
      const node = document.getElementById(id);
      if (!node) continue;

      nodes.current.set(id, node);

      // Faixa estreita no meio da tela: a seção que a cruza é a atual. Com a
      // faixa no topo, duas seções ficariam ativas durante a rolagem.
      const observer = new IntersectionObserver(
        () => {
          const visible = [...nodes.current.entries()]
            .map(([sectionId, element]) => ({
              sectionId,
              top: element.getBoundingClientRect().top,
            }))
            .filter(({ top }) => top > 80 && top < window.innerHeight * 0.6)
            .sort((a, b) => a.top - b.top);

          const current = visible[0]?.sectionId;
          if (current) onActiveChange(current);
        },
        { rootMargin: "-80px 0px -40% 0px", threshold: 0 },
      );

      observer.observe(node);
      seen.set(id, observer);
    }

    return () => seen.forEach((observer) => observer.disconnect());
  }, [sections, onActiveChange]);

  function goTo(id: string) {
    const node = nodes.current.get(id) ?? document.getElementById(id);
    if (!node) return;

    onActiveChange(id);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    // O hash deixa a seção linkável, mas sem o salto brusco que um
    // location.hash puro causaria.
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Seções das configurações"
      // No mobile a lista de pills é rolável, senão quatro itens não cabem.
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
    >
      {sections.map((section) => {
        const isActive = section.id === active;

        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => goTo(section.id)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-white/[0.10] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
