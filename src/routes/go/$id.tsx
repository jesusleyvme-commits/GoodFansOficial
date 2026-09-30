import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

import { siteUrl } from "@/lib/env";
import { UUID_RE } from "@/lib/links";

/**
 * Teto do corpo do POST.
 *
 * O beacon manda `{"eventId":"<uuid>"}`, uns 60 bytes. O formulário de gate
 * manda nome, e-mail, telefone, consentimento e o id: com nomes e e-mails do
 * tamanho real, dá na casa das 400. 1 KiB dá folga para texto normal e ainda
 * mantém o custo de um abuse baixo — esta rota é pública e sem autenticação,
 * então `request.text()` sem limite deixa qualquer um mandar megabytes e fazer
 * o servidor buffering em memória.
 */
const MAX_BODY_BYTES = 1024;

/** Teto por campo, para ninguém guardar uma redação dentro do banco. */
const MAX_FIELD_CHARS = { name: 120, email: 254, phone: 32 } as const;

const GATE_REFUSED =
  "Não foi possível liberar o acesso. Confira os dados e o aceite do termos e tente de novo.";

export const Route = createFileRoute("/go/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Módulos de rota vão para o bundle do cliente, então o resolvedor
        // server-only é importado dinamicamente de dentro do handler.
        const { renderRedirectPage, renderUnavailablePage } = await import("@/lib/redirect-page");

        const html = (body: string, status: number) =>
          new Response(body, {
            status,
            headers: {
              "content-type": "text/html; charset=utf-8",
              // O evento Purchase precisa disparar a cada visita, então este
              // documento nunca pode vir de cache compartilhado nem do navegador.
              "cache-control": "no-store, no-cache, must-revalidate, private",
              "x-robots-tag": "noindex, nofollow",
            },
          });

        // Rejeitar ids malformados aqui mantém lixo longe do PostgREST.
        if (!UUID_RE.test(params.id)) {
          return html(renderUnavailablePage(), 404);
        }

        const { resolveLink } = await import("@/lib/resolve.server");
        const link = await resolveLink(params.id);

        if (!link) {
          return html(renderUnavailablePage(), 404);
        }

        return html(
          renderRedirectPage({
            destination: link.destinationUrl,
            pixelId: link.pixelId,
            productName: link.productName,
            valueEur: link.valueEur,
            linkId: params.id,
            // Um id por visita, usado nos dois sinais para a Meta deduplicar.
            eventId: crypto.randomUUID(),
          }),
          200,
        );
      },

      // Clique em "Entrar agora". O navegador manda o mesmo event_id que já
      // está no `fbq`, e quem chama a Meta é o banco — o token da conta de
      // anúncios nunca chega a este processo.
      POST: async ({ params, request }) => {
        const noContent = () =>
          new Response(null, {
            status: 204,
            headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
          });

        if (!UUID_RE.test(params.id)) return noContent();

        // O corpo legítimo é `{"eventId":"<uuid>"}`, uns 60 bytes. Esta rota é
        // pública e sem autenticação, então `request.text()` sem limite deixa
        // qualquer um mandar megabytes e fazer o servidor buffering em memória.
        // O `content-length` cobre o caso comum; a checagem depois do `text()`
        // cobre corpo sem o header, ainda que o buffer já tenha sido feito.
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return noContent();

        // O id vem da própria página renderizada, mas é conferido mesmo assim:
        // esta rota é pública e o corpo é controlado por quem chama.
        let eventId = "";
        try {
          const raw = await request.text();
          if (raw.length > MAX_BODY_BYTES) return noContent();

          const body = JSON.parse(raw) as { eventId?: unknown };
          if (typeof body.eventId === "string" && UUID_RE.test(body.eventId)) {
            eventId = body.eventId;
          }
        } catch {
          // corpo vazio ou inválido: sem evento, e sem erro para o visitante.
        }

        if (!eventId) return noContent();

        // A URL vai montada com o domínio do site, e não com o que veio no
        // `Host`: atrás de proxy esse header é do cliente, e um host forjado
        // apareceria como `event_source_url` de uma conversão que ninguém fez.
        // `website` exige esse campo, então ele precisa ser o endereço verdadeiro.
        try {
          const { trackDeliveryConversion } = await import("@/lib/meta-conversion.server");
          await trackDeliveryConversion({
            linkId: params.id,
            eventId,
            clientIp: getRequestIP({ xForwardedFor: true }),
            userAgent: getRequestHeader("user-agent"),
            sourceUrl: new URL(`/go/${params.id}`, `${siteUrl()}/`).href,
          });
        } catch (error) {
          // Registrar a conversão é o melhor esforço: falhar aqui não pode
          // virar erro 500 na tela de quem acabou de liberar o acesso.
          console.error("[go] registro da conversão falhou:", error);
        }

        return noContent();
      },
    },
  },
});
