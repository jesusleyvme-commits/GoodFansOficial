import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageSettingsForm } from "@/components/page-settings-form";
import { Spinner } from "@/components/spinner";
import type { DeliveryLink } from "@/lib/database.types";
import { listAllLinks } from "@/lib/links-api";
import { getPageSettings, type PageSettings } from "@/lib/page-api";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/pagina")({
  component: PageSettingsPage,
  head: () => pageHead({ title: "Página de entrega", path: "/dashboard/pagina" }),
});

function PageSettingsPage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [links, setLinks] = useState<DeliveryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const [loaded, loadedLinks] = await Promise.all([getPageSettings(), listAllLinks()]);
      setSettings(loaded);
      setLinks(loadedLinks);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Não foi possível carregar a sua página.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Spinner className="size-5 text-brand-400" />
        Carregando a página…
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="rounded-input border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-100/90">
        {loadError ?? "Não foi possível carregar a sua página."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Página de entrega</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A tela que o visitante vê antes de ser levado ao destino. Vale para todos os seus links.
        </p>
      </header>

      <PageSettingsForm settings={settings} links={links} onSaved={setSettings} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Seus links</h2>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum link ainda. Crie um em Modelos para poder publicar e pré-visualizar.
          </p>
        ) : (
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  to="/dashboard/models/$modelId"
                  params={{ modelId: link.model_id }}
                  search={{ link: link.id }}
                  className="flex items-center justify-between rounded-input border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm transition-colors hover:bg-white/[0.04]"
                >
                  <span className="truncate">{link.product_name}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
