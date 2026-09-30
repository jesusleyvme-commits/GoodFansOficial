/**
 * Contrato do evento da Conversions API, em um lugar só.
 *
 * A Meta não tem validação boa: campo obrigatório faltando volta como
 * "Invalid parameter", código 100, o mesmo texto que ela usa quando o token não
 * enxerga o conjunto de dados. Foi exatamente esse amalgama que custou um
 * diagnóstico inteiro aqui. Por isso o contrato fica escrito em um módulo puro,
 * testado, em vez de espalhado dentro dos dois lugares que enviam evento.
 *
 * O que a Meta marca como obrigatório, e que este módulo garante sempre:
 * `event_name`, `event_time`, `event_id`, `action_source` e `user_data`.
 * `website` exige ainda `event_source_url` e o user agent.
 */

export type CapiUserData = {
  /** IP e user agent não são PII: a Meta os quer em claro, fora do hash. */
  client_ip_address?: string | null;
  client_user_agent?: string | null;
};

export type CapiCustomData = {
  value: number;
  currency: string;
};

export type CapiEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  user_data: Record<string, string>;
  event_source_url?: string;
  test_event_code?: string;
  custom_data?: CapiCustomData;
};

export type BuildCapiEventInput = {
  eventName: string;
  /** Unix em segundos. O padrão é agora, porque é isso que a Meta espera. */
  eventTime?: number;
  eventId: string;
  /**
   * `website` para conversão происso de uma página; `system_generated` para
   * evento que o app gera sozinho. `website` obriga `eventSourceUrl`.
   */
  actionSource: "website" | "system_generated";
  userData?: CapiUserData;
  eventSourceUrl?: string | null;
  /** Só em evento de teste. Sem ele, a Meta conta como conversão real. */
  testEventCode?: string | null;
  /** Receita. Ausente ou não positivo deixa o evento sem `custom_data`. */
  value?: number | null;
  currency?: string;
};

function present(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Monta o evento já no formato que a Meta aceita, descartando o que veio vazio.
 *
 * Campo vazio é diferente de campo ausente: mandar `client_ip_address: ""` faz a
 * Meta recusar o evento inteiro, enquanto omitir a chave é aceito. É por isso
 * que a limpeza acontece aqui e não no chamador.
 */
export function buildCapiEvent(input: BuildCapiEventInput): CapiEvent {
  const userData: Record<string, string> = {};
  const ip = present(input.userData?.client_ip_address);
  const userAgent = present(input.userData?.client_user_agent);

  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const event: CapiEvent = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: input.actionSource,
    // A Meta exige a chave. Vazio aqui ainda é melhor que ausente: some com o
    // detalhe do motivo em vez de devolver um código 100 genérico.
    user_data: userData,
  };

  const sourceUrl = present(input.eventSourceUrl);
  if (sourceUrl) event.event_source_url = sourceUrl;

  const testEventCode = present(input.testEventCode);
  if (testEventCode) event.test_event_code = testEventCode;

  const value = input.value;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    event.custom_data = { value, currency: input.currency ?? "EUR" };
  }

  return event;
}
