import type { DeliveryLink } from "@/lib/database.types";
import { normalizeDestinationUrl } from "@/lib/links";
import { requireUserId } from "@/lib/require-user";
import { supabase } from "@/lib/supabase";

export { requireUserId };

/** Transforma um erro do PostgREST em algo que o criador consiga resolver. */
export function readError(error: { message: string; code?: string } | null): string {
  if (!error) return "";
  if (error.code === "42501") return "Você não tem permissão para fazer isso.";
  if (error.code === "23505") return "Esse registro já existe.";
  return error.message;
}

const LINK_SELECT =
  "id, creator_id, model_id, product_name, destination_url, value_eur, created_at, " +
  "show_logo, collect_name, collect_email, collect_phone, gate_headline, gate_subhead, privacy_note";

export async function listLinksByModel(modelId: string): Promise<DeliveryLink[]> {
  const { data, error } = await supabase()
    .from("delivery_links")
    .select(LINK_SELECT)
    .eq("model_id", modelId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(readError(error));
  return data ?? [];
}

export type NewLinkInput = {
  modelId: string;
  productName: string;
  destinationUrl: string;
  /** Receita em euros. null não informa valor para a Meta. */
  valueEur?: number | null;
};

export async function createLink(input: NewLinkInput): Promise<DeliveryLink> {
  const creatorId = await requireUserId();
  const destinationUrl = normalizeDestinationUrl(input.destinationUrl);
  if (!destinationUrl) throw new Error("Informe uma URL de destino válida.");

  const productName = input.productName.trim();
  if (!productName) throw new Error("Informe o nome do produto.");

  const { data, error } = await supabase()
    .from("delivery_links")
    .insert({
      creator_id: creatorId,
      model_id: input.modelId,
      product_name: productName,
      destination_url: destinationUrl,
      value_eur: input.valueEur ?? null,
    })
    .select(LINK_SELECT)
    .single();

  if (error) throw new Error(readError(error));
  return data;
}

export type EditLinkInput = {
  productName: string;
  destinationUrl: string;
  /** null limpa o valor, e a Meta volta a receber o evento sem receita. */
  valueEur?: number | null;
};

export async function updateLink(id: string, input: EditLinkInput): Promise<DeliveryLink> {
  const destinationUrl = normalizeDestinationUrl(input.destinationUrl);
  if (!destinationUrl) throw new Error("Informe uma URL de destino válida.");

  const productName = input.productName.trim();
  if (!productName) throw new Error("Informe o nome do produto.");

  const { data, error } = await supabase()
    .from("delivery_links")
    .update({
      product_name: productName,
      destination_url: destinationUrl,
      value_eur: input.valueEur ?? null,
    })
    .eq("id", id)
    .select(LINK_SELECT)
    .single();

  if (error) throw new Error(readError(error));
  return data;
}
export type GateSettingsInput = {
  showLogo: boolean;
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  /** null usa o texto padrão do app. */
  headline?: string | null;
  subhead?: string | null;
  privacyNote?: string | null;
};

/**
 * Ajusta o gate do link.
 *
 * Vai pela função `update_link_gate` e não por `update`, porque a checagem de
 * posse é feita no banco com auth.uid() ali dentro. Confiar no RLS da tabela
 * deixaria a decisão de autorização em dois lugares.
 */
export async function updateLinkGate(id: string, input: GateSettingsInput): Promise<DeliveryLink> {
  await requireUserId();

  const clean = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    // Vazio é o jeito de o creator voltar ao texto padrão do app. Enviando ""
    // o banco gravaria string vazia e a página ficaria sem título.
    return trimmed ? trimmed : null;
  };

  const { error } = await supabase().rpc("update_link_gate", {
    p_link_id: id,
    p_show_logo: input.showLogo,
    p_collect_name: input.collectName,
    p_collect_email: input.collectEmail,
    p_collect_phone: input.collectPhone,
    p_headline: clean(input.headline),
    p_subhead: clean(input.subhead),
    p_privacy_note: clean(input.privacyNote),
  });

  if (error) throw new Error(readError(error));

  const { data, error: readErrorBack } = await supabase()
    .from("delivery_links")
    .select(LINK_SELECT)
    .eq("id", id)
    .single();

  if (readErrorBack) throw new Error(readError(readErrorBack));
  return data;
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase().from("delivery_links").delete().eq("id", id);

  if (error) throw new Error(readError(error));
}
