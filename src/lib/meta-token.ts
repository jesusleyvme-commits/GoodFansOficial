import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";

/**
 * O token do Graph API da Meta é uma credencial da conta de anúncios.
 *
 * Ele é gravado cifrado e, por padrão, nunca é lido de volta: estas funções só
 * escrevem, e a UI mostra apenas "configurado". A exceção é o botão de olho do
 * campo da modelo, que pede o valor em claro ao servidor na hora, para o dono
 * conferir a credencial, e nunca o coloca em payload de lista.
 */

export async function saveModelMetaToken(modelId: string, token: string): Promise<boolean> {
  const { data, error } = await supabase().rpc("set_model_meta_token", {
    p_model_id: modelId,
    p_token: token,
  });

  if (error) throw new Error(readError(error));
  return Boolean(data);
}

/**
 * O token da Meta costuma ser bem longo; o limite aqui é folgado para não
 * barrar um token válido, mas curto o bastante para não aceitar besteira.
 */
export const META_TOKEN_MIN = 20;
export const META_TOKEN_MAX = 1000;

export function normalizeMetaToken(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length < META_TOKEN_MIN) {
    throw new Error("Esse token parece curto demais para ser do Graph API.");
  }
  if (trimmed.length > META_TOKEN_MAX) {
    throw new Error("Token longo demais para ser do Graph API.");
  }
  return trimmed;
}
