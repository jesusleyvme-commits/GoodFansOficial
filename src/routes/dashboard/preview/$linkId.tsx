import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import type { DeliveryLink } from "@/lib/database.types";
import { getLink } from "@/lib/links-api";
import { renderRedirectPage } from "@/lib/redirect-page";
import { pageHead } from "@/lib/site-head";

/**
 * Pré-visualização da página de entrega.
 *
 * Renderiza `renderRedirectPage` de verdade, dentro de um iframe, em vez de
 * recriar a tela em React. É a diferença entre o preview e a página real: se o
 * preview fosse uma reimplementação, ele/show-and-tell passaria justo nas
 * mudanças que importam, porque são as mesmas coisas que ninguém reescreve junto.
 *
 * A rota é cliente (`ssr: false` vem do layout do /dashboard) porque a sessão
 * vive no localStorage. Sem token no servidor, e com a RLS por `creator_id`, a
 * posse do link é conferida pelo banco na consulta — não há caminho para ver o
 * link de outra pessoa.
 */
export const Route = createFileRoute("/dashboard/preview/$linkId")({
  head: () => pageHead({ title: "Pré-visualização", path: "/dashboard" }),
  component: LinkPreview,
});

function LinkPreview() {
  const { linkId } = useParams({ from: "/dashboard/preview/$linkId" });
  const [link, setLink] = useState<DeliveryLink | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const load = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setLink(await getLink(linkId));
    } catch {
      setErro("Não foi possível abrir este link.");
    } finally {
      setCarregando(false);
    }
  }, [linkId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * O id da visita é trocado a cada render para que o iframe recarregue. No
   * preview ele não vira evento em lugar nenhum — o pixel é cortado no modo
   * preview —, então pode ser qualquer coisa.
   */
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (link) setNonce((n) => n + 1);
  }, [link]);

  const html = useMemo(() => {
    if (!link) return "";
    return renderRedirectPage({
      destination: link.destination_url,
      // O preview não carrega o pixel de propósito: abrir esta tela não pode
      // virar uma conversão no relatório do anúncio.
      pixelId: null,
      productName: link.product_name,
      valueEur: link.value_eur,
      linkId: link.id,
      eventId: crypto.randomUUID(),
      preview: true,
      showLogo: link.show_logo,
      collectName: link.collect_name,
      collectEmail: link.collect_email,
      collectPhone: link.collect_phone,
      headline: link.gate_headline,
      subhead: link.gate_subhead,
      privacyNote: link.privacy_note,
    });
  }, [link]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard" aria-label="Voltar para modelos">
            <ArrowLeft />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">Pré-visualização</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {link ? link.product_name : "Como o visitante vê esta página."}
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={carregando}>
          <RefreshCw />
          Recarregar
        </Button>
      </div>

      {erro ? (
        <div className="rounded-card border border-red-500/20 bg-red-500/[0.04] p-8 text-center text-sm text-red-200">
          {erro}
        </div>
      ) : carregando || !link ? (
        <div className="grid place-items-center py-20">
          <Spinner className="size-5 text-brand-400" />
        </div>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enviar o formulário aqui não grava nada e não conta como conversão. Para valer, ajuste o
            que precisa, salve e abra o link de verdade.
          </p>

          <div className="overflow-hidden rounded-card border border-white/[0.06] bg-white/[0.03]">
            <iframe
              key={nonce}
              title="Pré-visualização da página de entrega"
              srcDoc={html}
              // Sem `allow-same-origin`, o documento do preview roda numa origem
              // opaca e não alcança o localStorage do painel — é o mesmo HTML que
              // a página real devolve, com o link de criação de conta à solta
              // dentro dele.
              sandbox="allow-scripts"
              className="h-[70vh] w-full border-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
