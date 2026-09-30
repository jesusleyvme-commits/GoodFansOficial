import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import { buildCapiEvent, type CapiUserData } from "@/lib/meta-event";
import { readError } from "@/lib/links-api";
import { clientAsUser } from "@/lib/user-client.server";

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 15_000;

const Params = z.object({
  linkId: z.string().uuid(),
  accessToken: z.string().min(1),
  testEventCode: z.string().max(64).optional(),
});

/**
 * Códigos da Meta são alfanuméricos (`TEST12345678`) e a tela de Test Events os
 * troca com o tempo. Aceitar só esse formato recusa lixo antes do round-trip,
 * sem risco de barrar um código válido em formato diferente.
 */
const TEST_EVENT_CODE_RE = /^[A-Z0-9]{4,40}$/;

/** `undefined` = não pediu teste. `null` = pediu, mas o código não é válido. */
function normalizeTestEventCode(value: string | undefined): string | undefined | null {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) return undefined;
  return TEST_EVENT_CODE_RE.test(trimmed) ? trimmed : null;
}

type TestResult = {
  ok: boolean;
  message: string;
  /** O que costuma estar errado por trás deste código. */
  hint?: string;
  /** Texto original da Meta, escondido por padrão: é o que diz a causa real. */
  detail?: string;
  /** Pixel que o evento usou, para o usuário conferir qual é. */
  pixelId?: string;
};

type GraphError = {
  message?: string;
  code?: number;
  /** A Meta manda o subcode em `error_subcode`; `subcode` é o nome interno. */
  error_subcode?: number;
  subcode?: number;
  /** Título curto e legível do motivo, quando a Meta envia. */
  error_user_title?: string;
  type?: string;
  fbtrace_id?: string;
};
type GraphEventsResponse = {
  events_received?: number;
  messages?: string[];
  errors?: GraphError[];
  error?: GraphError;
  /** Ecoado de volta quando a Meta aceitou o código de teste enviado. */
  test_event_code?: string;
  fbtrace_id?: string;
};

function subcodeOf(error: GraphError): number | undefined {
  return error.error_subcode ?? error.subcode;
}

/** O erro cru, com os campos que o suporte da Meta pede quando algo falha. */
function formatRawError(error: GraphError): string {
  const subcode = subcodeOf(error);
  const parts = [
    error.message?.trim(),
    error.code !== undefined ? `code ${error.code}` : undefined,
    subcode !== undefined ? `subcode ${subcode}` : undefined,
    error.type,
    error.error_user_title?.trim(),
    error.fbtrace_id ? `fbtrace_id ${error.fbtrace_id}` : undefined,
  ];

  return parts.filter(Boolean).join(" | ");
}

/**
 * O que a Meta costuma estar dizendo, e o que costuma estar errado por trás.
 *
 * O código 100 é o caso ambiguo: a Meta o usa tanto para payload inválido
 * quanto para "este token não enxerga este conjunto de dados", com o mesmo
 * texto nos dois casos. Ele é tratado como o que é mais comum — payload — e
 * o subcode é que diz qual campo faltou. Token e permissão têm códigos
 * próprios (190 e 200) e são tratados como tales abaixo.
 */
const FRIENDLY_ERRORS: Record<number, { text: string; hint?: string }> = {
  100: {
    text: "A Meta recusou o corpo do evento: parâmetro inválido.",
    hint: "Este código costuma ser do payload, não do token. O subcode na resposta da Meta diz qual campo ela recusou.",
  },
  190: {
    text: "A Meta recusou o token.",
    hint: "Confira se colou o token da API de Conversões, e não o token de acesso do pixel.",
  },
  200: {
    text: "O token não tem acesso a este pixel.",
    hint: "O token foi gerado para outro conjunto.",
  },
  10: {
    text: "A permissão do pixel não está liberada para este token.",
    hint: "Na Meta, confira as permissões dePartners no conjunto de dados.",
  },
};

function describeError(
  error: GraphError | undefined,
  fallback: string,
): { text: string; detail?: string; hint?: string } {
  if (!error) return { text: fallback };

  const raw = error.message?.trim() ?? "";
  const friendly = error.code !== undefined ? FRIENDLY_ERRORS[error.code] : undefined;

  return {
    text: friendly?.text ?? (raw || fallback),
    // Traduzir e esconder o original já custou um diagnóstico antes: a mensagem
    // da Meta é a parte que resolve o problema.
    detail: formatRawError(error) || undefined,
    hint: friendly?.hint,
  };
}

/**
 * O contexto da chamada, para o `user_data` obrigatório da Conversions API.
 *
 * Um teste de conexão não tem visitante: não existe ninguém atrás dele. O que
 * dá para mandar sem inventar dado pessoal é o contexto real da requisição, e
 * IP e user agent não são PII — a Meta os quer em claro, fora do hash. Vêm do
 * request porque quem aperta o botão é quem está configurando o pixel.
 *
 * Se nada disso existir, `user_data` vai vazio e a Meta recusa com código 100:
 * nesse caso a resposta da Meta é a informação útil, e não há o que inventar
 * aqui para contorná-la.
 */
function callerContext(): CapiUserData {
  return {
    client_ip_address: getRequestIP({ xForwardedFor: true }),
    client_user_agent: getRequestHeader("user-agent"),
  };
}

/**
 * A resposta de sucesso da Meta também é evidência, e é a única que diz se o
 * código de teste foi aceito: um código velho ou de outro conjunto é ignorado
 * em silêncio, com `events_received: 1` igual, e o evento cai na lista comum em
 * vez da aba de teste. Comparar o código ecoado com o enviado é o que separa as
 * duas coisas.
 */
function formatAcceptance(body: GraphEventsResponse): string | undefined {
  const parts = [
    `events_received ${body.events_received ?? 0}`,
    body.test_event_code ? `test_event_code ${body.test_event_code}` : undefined,
    body.fbtrace_id ? `fbtrace_id ${body.fbtrace_id}` : undefined,
    ...(body.messages ?? []),
  ];

  return parts.join(" | ");
}

/**
 * Testa a conexão mandando um evento real de teste para a Conversions API.
 *
 * O teste é do link, e não da modelo, porque é no link que a pessoa quer saber
 * se está funcionando: ele carrega o valor em euros, que entra no evento. Token
 * e pixel são os da modelo, então testar dois links da mesma modelo dá o mesmo
 * resultado no que importa.
 */
export const testLinkPixel = createServerFn({ method: "POST" })
  .inputValidator(Params)
  .handler(async ({ data }): Promise<TestResult> => {
    // Papel `authenticated`, com o JWT de quem está chamando: a RLS já garante
    // que ele só enxerga as próprias linhas, e o token em claro sai pela função
    // SECURITY DEFINER, que repete a checagem de posse com `auth.uid()`.
    const client = clientAsUser(data.accessToken);

    const { data: link, error: linkError } = await client
      .from("delivery_links")
      .select("id, model_id, value_eur")
      .eq("id", data.linkId)
      .maybeSingle();

    // Toda falha daqui para baixo vira `{ ok: false, message }`, e não exceção:
    // o botão styling a resposta por `result.ok`, e um `throw` nesse ponto
    // mostraria o texto cru do Postgres por cima do estado formatado.
    if (linkError) return { ok: false, message: readError(linkError) };
    if (!link) return { ok: false, message: "Esse link não existe ou não é seu." };

    const { data: model, error: modelError } = await client
      .from("models")
      .select("meta_pixel_id, has_meta_token")
      .eq("id", link.model_id)
      .maybeSingle();

    // Sem isto, uma falha de rede ou de RLS nessa consulta chega como `model`
    // nulo, e a linha de baixo diria "a modelo não está mais disponível" — um
    // diagnóstico errado e convincente, do tipo que faz perder tempo.
    if (modelError) return { ok: false, message: readError(modelError) };
    if (!model) return { ok: false, message: "A modelo deste link não está mais disponível." };

    // O pixel é da modelo, não do link: todos os links dela disparam no mesmo.
    const pixelId = model.meta_pixel_id?.trim() ?? "";
    if (!pixelId) {
      return { ok: false, message: "Esta modelo ainda não tem pixel configurado." };
    }
    if (!model.has_meta_token) {
      return { ok: false, message: "A modelo ainda não tem token da API de Conversões." };
    }

    const { data: token, error: tokenError } = await client.rpc("reveal_model_meta_token", {
      p_model_id: link.model_id,
    });
    if (tokenError || typeof token !== "string" || token === "") {
      return { ok: false, message: "Não consegui ler o token. Salve o token de novo." };
    }

    // O código de teste vem da tela de Test Events do conjunto de dados e a Meta
    // o troca com o tempo, então ele é colado a cada teste em vez de guardado no
    // banco: um código velho guardado seria pior do que nenhum, porque a Meta
    // recusa o evento sem explicar que ele expirou.
    const testEventCode = normalizeTestEventCode(data.testEventCode);
    if (testEventCode === null) {
      return {
        ok: false,
        message: "O código de teste não parece um código da Meta.",
        hint: "Copie o valor que aparece no topo da aba de eventos de teste do seu conjunto de dados.",
      };
    }

    // Obrigatório, e não opcional: o que este botão manda é um Purchase. Sem o
    // código, a Meta conta como conversão real e o conjunto ganha uma venda que
    // não aconteceu, que é o tipo de erro que só aparece semanas depois no
    // ROAS e já não dá para saber de onde veio.
    if (!testEventCode) {
      return {
        ok: false,
        message: "Cole o código de teste para enviar uma conversão de teste.",
        hint: "Events Manager → seu conjunto → Eventos de teste. O código fica no topo da tela. Ele existe para o evento não contar como conversão real.",
      };
    }

    // A Meta exige value e currency em Purchase, e recusa o evento inteiro sem
    // os dois. Falhar aqui é melhor do que levar um código 100 de volta.
    const value = typeof link.value_eur === "string" ? Number(link.value_eur) : link.value_eur;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return {
        ok: false,
        message: "Este link não tem valor, e a Meta exige valor numa conversão.",
        hint: "Edite o link e preencha o valor em euros antes de testar o pixel.",
      };
    }

    // Purchase e não PageView: o botão existe para provar que a conversão chega,
    // com o valor que a Meta vai usar para calcular o retorno. O `test_event_code`
    // acima é o que impede esse teste de virar uma venda de mentira.
    //
    // `system_generated` porque o evento é gerado pelo app e não por uma visita:
    // é o que a Meta documenta para evento automático, e também dispensa o
    // `event_source_url` que `website` exigiria — aqui não existe página nenhuma
    // para apontar.
    const event = buildCapiEvent({
      eventName: "Purchase",
      // Um id por teste: a Meta deduplica por event_id, então repetir o
      // botão não infla nada.
      eventId: crypto.randomUUID(),
      actionSource: "system_generated",
      userData: callerContext(),
      testEventCode,
      value,
      currency: "EUR",
    });

    let body: GraphEventsResponse;
    let isOkStatus = true;
    try {
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: [event] }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      isOkStatus = res.ok;
      body = (await res.json()) as GraphEventsResponse;
    } catch (error) {
      // Logar o erro real é o que separa "a Meta não respondeu" de "o servidor
      // não tem internet" — e também de um bug nosso no caminho, que antes
      // aparecia para o usuário como se fosse a internet dele.
      console.error("[meta-test] chamada à Meta falhou:", error);

      const timedOut = error instanceof Error && error.name === "TimeoutError";

      return {
        ok: false,
        message: timedOut
          ? `A Meta não respondeu em ${TIMEOUT_MS / 1000} segundos.`
          : "Não consegui falar com a Meta. Verifique a internet e tente de novo.",
        hint: timedOut ? "Aguente o clique para não disparar a requisição duas vezes." : undefined,
        pixelId,
      };
    }

    // O tratamento da resposta fica fora do `try` de propósito: um erro lançado
    // aqui dentro seria reportado como falha de rede, escondendo um bug em vez
    // de mostrar o que a Meta respondeu.
    if (!body || body.error || !isOkStatus) {
      const described = describeError(
        body?.error ?? body?.errors?.[0],
        "A Meta recusou a chamada.",
      );
      return {
        ok: false,
        message: described.text,
        hint: described.hint,
        detail: described.detail,
        pixelId,
      };
    }

    if (body.errors?.length) {
      const described = describeError(body.errors[0], "A Meta registrou um erro no evento.");
      return {
        ok: false,
        message: described.text,
        hint: described.hint,
        detail: described.detail,
        pixelId,
      };
    }

    if ((body.events_received ?? 0) < 1) {
      return {
        ok: false,
        message: body.messages?.[0] ?? "A Meta aceitou a chamada, mas não registrou o evento.",
        pixelId,
      };
    }

    const detail = formatAcceptance(body);

    return {
      ok: true,
      message: `Conversão de teste de ${value} EUR aceita pelo pixel ${pixelId}.`,
      hint: "Ela aparece na aba de eventos de teste do conjunto, e não conta como conversão real.",
      detail,
      pixelId,
    };
  });
