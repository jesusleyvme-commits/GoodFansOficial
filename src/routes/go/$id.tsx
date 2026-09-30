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

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // O evento Purchase precisa disparar a cada visita, então este
      // documento nunca pode vir de cache compartilhado nem do navegador.
      "cache-control": "no-store, no-cache, must-revalidate, private",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function readField(form: URLSearchParams, name: keyof typeof MAX_FIELD_CHARS): string {
  const value = (form.get(name) ?? "").trim();
  // Campo estourado vira vazio, e o banco recusa o vazio. Melhor recusar do que
  // truncar: quem digitou 400 letras não queria as 120 primeiras.
  return value.length > MAX_FIELD_CHARS[name] ? "" : value;
}

/**
 * Coleta do gate. Grava o que o link pede e só então libera o acesso.
 *
 * A ordem importa: `track_delivery_conversion` procura a coleta pelo
 * `event_id` para hashear o contato, então enviar a conversão antes da gravação
 * mandaria um evento sem `em`/`ph` e o `fn`/`ln` ficariam de fora.
 */
async function submitGateForm(linkId: string, raw: string): Promise<Response> {
  // Módulos de rota vão para o bundle do cliente, então tudo server-only entra
  // por import dinâmico.
  const { renderRedirectPage, renderUnavailablePage } = await import("@/lib/redirect-page");
  const { resolveLink } = await import("@/lib/resolve.server");

  const link = await resolveLink(linkId);
  if (!link) return htmlResponse(renderUnavailablePage(), 404);

  const form = new URLSearchParams(raw);

  // Recusa com a mesma tela e um aviso genérico. O motivo da recusa vem do
  // banco e não entra no HTML: um "e-mail inválido" confirmeria o que o
  // formulário já tem, e um erro de banco não deve ser traduzido para o
  // visitante. O creator descobre o que houve na lista de coletas.
  const refused = () =>
    htmlResponse(
      renderRedirectPage({
        destination: link.destinationUrl,
        pixelId: link.pixelId,
        productName: link.productName,
        valueEur: link.valueEur,
        linkId,
        // Um id novo: o anterior já foi recusado e não pode virar evento.
        eventId: crypto.randomUUID(),
        error: GATE_REFUSED,
        ...link.gate,
      }),
      422,
    );

  const eventId = form.get("eventId") ?? "";
  if (!UUID_RE.test(eventId)) return refused();

  try {
    const { anonClient } = await import("@/lib/anon-client.server");

    const { data: saved, error } = await anonClient().rpc("submit_gate", {
      p_link_id: linkId,
      // Só o que o link pede. Campo desligado não chega ao banco, mesmo que
      // alguém acrescente o campo ao POST na mão.
      p_name: link.gate.collectName ? readField(form, "name") : null,
      p_email: link.gate.collectEmail ? readField(form, "email") : null,
      p_phone: link.gate.collectPhone ? readField(form, "phone") : null,
      p_event_id: eventId,
      // O navegador já exige o checkbox por `required`. Isto cobre quem desliga
      // o JavaScript ou monta o POST na mão: sem marcação, não há consentimento,
      // e consentimento é o que autoriza a gravação.
      p_consent: form.get("consent") === "1",
    });

    if (error) {
      console.error(`[go] submit_gate falhou: ${error.message}`);
      return refused();
    }
    if (saved !== true) return refused();
  } catch (error) {
    console.error("[go] submit_gate lançou:", error);
    return refused();
  }

  // Melhor esforço, depois de gravar. Falhar aqui não pode virar erro na tela de
  // quem acabou de liberar o acesso.
  try {
    const { trackDeliveryConversion } = await import("@/lib/meta-conversion.server");
    await trackDeliveryConversion({
      linkId,
      eventId,
      clientIp: getRequestIP({ xForwardedFor: true }),
      userAgent: getRequestHeader("user-agent"),
      sourceUrl: new URL(`/go/${linkId}`, `${siteUrl()}/`).href,
    });
  } catch (error) {
    console.error("[go] registro da conversão falhou:", error);
  }

  // 303 e não 302: o visitante veio por POST e a resposta precisa ser lida com
  // GET, senão o destino herda o método e pode rejeitar o envio.
  return new Response(null, {
    status: 303,
    headers: {
      location: link.destinationUrl,
      "cache-control": "no-store, no-cache, must-revalidate, private",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export const Route = createFileRoute("/go/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Módulos de rota vão para o bundle do cliente, então o resolvedor
        // server-only é importado dinamicamente de dentro do handler.
        const { renderRedirectPage, renderUnavailablePage } = await import("@/lib/redirect-page");

        // Rejeitar ids malformados aqui mantém lixo longe do PostgREST.
        if (!UUID_RE.test(params.id)) {
          return htmlResponse(renderUnavailablePage(), 404);
        }

        const { resolveLink } = await import("@/lib/resolve.server");
        const link = await resolveLink(params.id);

        if (!link) {
          return htmlResponse(renderUnavailablePage(), 404);
        }

        return htmlResponse(
          renderRedirectPage({
            destination: link.destinationUrl,
            pixelId: link.pixelId,
            productName: link.productName,
            valueEur: link.valueEur,
            linkId: params.id,
            // Um id por visita, usado nos dois sinais para a Meta deduplicar.
            eventId: crypto.randomUUID(),
            showLogo: link.gate.showLogo,
            collectName: link.gate.collectName,
            collectEmail: link.gate.collectEmail,
            collectPhone: link.gate.collectPhone,
            headline: link.gate.headline,
            subhead: link.gate.subhead,
            privacyNote: link.gate.privacyNote,
          }),
          200,
        );
      },

      // Duas coisas chegam aqui, e o content-type diz qual é:
      //
      // 1. form-urlencoded — o gate. Alguém preencheu os dados e quer entrar.
      //    Grava a coleta e responde 303 para o destino.
      // 2. JSON — o clique. Só registra a conversão, sem nada mais.
      //
      // A conversão do gate é feita dentro do POST do formulário, e não por
      // beacon: o formulário chega aqui mesmo sem JavaScript, e é esse o sinal
      // que não pode se perder.
      POST: async ({ params, request }) => {
        const noContent = () =>
          new Response(null, {
            status: 204,
            headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
          });

        if (!UUID_RE.test(params.id)) return noContent();

        // O `content-length` cobre o caso comum; a checagem depois do `text()`
        // cobre corpo sem o header, ainda que o buffer já tenha sido feito.
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return noContent();

        const raw = await request.text().catch(() => "");
        if (raw.length > MAX_BODY_BYTES) return noContent();

        if (
          (request.headers.get("content-type") ?? "").startsWith(
            "application/x-www-form-urlencoded",
          )
        ) {
          return submitGateForm(params.id, raw);
        }

        // O id vem da própria página renderizada, mas é conferido mesmo assim:
        // esta rota é pública e o corpo é controlado por quem chama.
        let eventId = "";
        try {
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
