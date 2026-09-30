import { type Database } from "@/lib/database.types";
import { anonClient } from "@/lib/anon-client.server";
import { normalizeDestinationUrl, normalizePixelId } from "@/lib/links";
import { publicAvatarUrl } from "@/lib/avatar-path";
import { supabaseUrl } from "@/lib/env";

export type ResolvedLink = {
  productName: string;
  destinationUrl: string;
  pixelId: string | null;
  valueEur: number | null;
  /** Foto da modelo, URL absoluta do bucket público, ou null se não tem foto. */
  photoUrl: string | null;
  gate: {
    collectName: boolean;
    collectEmail: boolean;
    collectPhone: boolean;
    headline: string | null;
    subhead: string | null;
    privacyNote: string | null;
  };
};

/**
 * Lê um link para a rota pública /go em uma única ida ao banco.
 *
 * Roda como `anon` contra a função SECURITY DEFINER `resolve_delivery_link`.
 * Essa função é a única coisa que a página de redirect alcança: o anon nunca
 * ganha acesso às tabelas, e este servidor não precisa de service-role key.
 *
 * Retorna null para id desconhecido, link desativado ou destino que não seja
 * http(s) puro.
 */
export async function resolveLink(id: string): Promise<ResolvedLink | null> {
  const { data, error } = await anonClient().rpc("resolve_delivery_link", { p_id: id });

  if (error) {
    console.error(`[go] resolve_delivery_link falhou: ${error.message}`);
    return null;
  }

  // O tipo vem do retorno declarado de `resolve_delivery_link`, e não da
  // tabela: a função já traz os campos do construtor do creator e o
  // `avatar_path` da modelo, que não existem em `delivery_links`.
  const row = data?.[0] as
    Database["public"]["Functions"]["resolve_delivery_link"]["Returns"][0] | undefined;
  if (!row) return null;

  const destinationUrl = normalizeDestinationUrl(row.destination_url);
  if (!destinationUrl) return null;

  const rawValue = typeof row.value_eur === "string" ? Number(row.value_eur) : row.value_eur;

  return {
    productName: row.product_name,
    destinationUrl,
    pixelId: normalizePixelId(row.pixel_id),
    // O PostgREST devolve numeric como string para não perder precisão, e a
    // Meta espera número no evento. Valor ausente continua ausente.
    valueEur: typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null,
    photoUrl: publicAvatarUrl(supabaseUrl(), row.avatar_path),
    gate: {
      // Normalização defensiva: o PostgREST devolve boolean como boolean, mas
      // um null ou coluna ausente também pode chegar aqui e não pode virar
      // "gate ligado" por acidente. Todo campo ligado tem que ser true de
      // verdade, e o padrão de ligar é decisão do creator, não deste código.
      collectName: row.collect_name === true,
      collectEmail: row.collect_email === true,
      collectPhone: row.collect_phone === true,
      headline: row.headline,
      subhead: row.subhead,
      privacyNote: row.privacy_note,
    },
  };
}
