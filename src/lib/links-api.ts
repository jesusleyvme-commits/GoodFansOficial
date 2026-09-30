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

// `as const` é obrigatório aqui, não enfeite: o supabase-js só descobre as
// colunas de retorno quando a string do select é um literal único. Montar a
// lista com concatenação ou variável sem const faz o tipo virar string e a
// consulta perder a checagem de coluna e de retorno.
const LINK_SELECT =
  "id, creator_id, model_id, product_name, destination_url, value_eur, created_at" as const;

export async function listLinksByModel(modelId: string): Promise<DeliveryLink[]> {
  const { data, error } = await supabase()
    .from("delivery_links")
    .select(LINK_SELECT)
    .eq("model_id", modelId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(readError(error));
  return data ?? [];
}

/**
 * Todos os links do creator, de qualquer modelo.
 *
 * Serve para escolher qual deles usar no preview da página global: a página é
 * uma só, mas o preview precisa de um link real, porque é do link que saem o
 * nome do produto, o destino e a foto da modelo.
 */
export async function listAllLinks(): Promise<DeliveryLink[]> {
  const { data, error } = await supabase()
    .from("delivery_links")
    .select(LINK_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(readError(error));
  return data ?? [];
}

/**
 * Lê um link só. Quem não é o dono não recebe nada: a RLS de `delivery_links`
 * é por `creator_id`, e `single()` em linha nenhuma vira erro, o que evita
 * ainda por cima o link existir ou não para o outro.
 */
export async function getLink(id: string): Promise<DeliveryLink | null> {
  const { data, error } = await supabase()
    .from("delivery_links")
    .select(LINK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(readError(error));
  return data;
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

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase().from("delivery_links").delete().eq("id", id);

  if (error) throw new Error(readError(error));
}
