import { anonClient } from "@/lib/anon-client.server";

export type DeliveryConversion = {
  linkId: string;
  /** O mesmo id que o pixel do navegador levou, para a Meta contar uma vez só. */
  eventId: string;
  clientIp?: string;
  userAgent?: string;
  /** A página onde o clique aconteceu; `website` exige este campo. */
  sourceUrl: string;
};

/**
 * Registra a conversão no conjunto de dados da modelo do link.
 *
 * Não existe caminho do servidor até o token: a rota /go roda como `anon` e
 * `reveal_model_meta_token` só responde ao dono da modelo. Por isso a chamada
 * não é feita daqui, e sim dentro de `track_delivery_conversion`, que
 * descriptografa e chama a Meta no banco. O token não chega ao app, nem à
 * resposta, nem a este processo.
 *
 * Devolve se o evento foi enfileirado, não se a Meta aceitou. O botão de teste
 * é quem mostra a resposta da Meta; aqui não há nada a fazer com um erro que
 * só aparece lá.
 */
export async function trackDeliveryConversion(input: DeliveryConversion): Promise<boolean> {
  const { data, error } = await anonClient().rpc("track_delivery_conversion", {
    p_link_id: input.linkId,
    p_event_id: input.eventId,
    p_client_ip: input.clientIp ?? null,
    p_user_agent: input.userAgent ?? null,
    p_source_url: input.sourceUrl,
  });

  if (error) {
    console.error(`[go] track_delivery_conversion falhou: ${error.message}`);
    return false;
  }

  return data === true;
}
