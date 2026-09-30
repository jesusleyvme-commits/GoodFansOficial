import { uploadAvatar, removeAvatar } from "@/lib/avatars";
import { requireUserId } from "@/lib/require-user";
import { normalizePixelId } from "@/lib/links";
import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";
import type { Model } from "@/lib/database.types";

// `meta_token_encrypted` fica de fora: a UI só precisa do booleano.
const MODEL_SELECT =
  "id, owner_id, name, destination_url, meta_pixel_id, has_meta_token, avatar_path, created_at, updated_at";

export async function listModels(): Promise<Model[]> {
  const { data, error } = await supabase()
    .from("models")
    .select(MODEL_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(readError(error));
  return data ?? [];
}

export async function getModel(id: string): Promise<Model | null> {
  const { data, error } = await supabase()
    .from("models")
    .select(MODEL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(readError(error));
  return data;
}

export type ModelInput = {
  name: string;
  pixelId: string | null;
  avatar: File | null;
};

function cleanModelInput(input: ModelInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da modelo.");

  // Campo vazio limpa o pixel da modelo; qualquer coisa preenchida precisa ser um ID real.
  const rawPixel = input.pixelId?.trim() ?? "";
  const metaPixelId = rawPixel === "" ? null : normalizePixelId(rawPixel);
  if (rawPixel !== "" && metaPixelId === null) {
    throw new Error("Isso não parece um ID de Meta Pixel válido.");
  }

  return { name, meta_pixel_id: metaPixelId };
}

export async function createModel(input: ModelInput): Promise<Model> {
  const ownerId = await requireUserId();
  const fields = cleanModelInput(input);

  // A linha nasce sem foto porque o upload depende do id gerado aqui; a coluna
  // é preenchida logo abaixo, num segundo passo.
  const { data, error } = await supabase()
    .from("models")
    .insert({ owner_id: ownerId, ...fields })
    .select(MODEL_SELECT)
    .single();

  if (error) throw new Error(readError(error));
  if (!input.avatar) return data;

  const avatarPath = await uploadAvatar(ownerId, data.id, input.avatar);
  return setAvatar(data.id, avatarPath, data);
}

export async function updateModel(id: string, input: ModelInput): Promise<Model> {
  const ownerId = await requireUserId();
  const fields = cleanModelInput(input);

  const { data, error } = await supabase()
    .from("models")
    .update(fields)
    .select(MODEL_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(readError(error));
  if (!input.avatar) return data;

  const avatarPath = await uploadAvatar(ownerId, id, input.avatar);

  // A troca de foto só faz sentido com um arquivo novo: sem ele, "remover" é um
  // voto a favor de manter a foto atual.
  if (data.avatar_path && data.avatar_path !== avatarPath) {
    await removeAvatar(data.avatar_path);
  }

  return setAvatar(id, avatarPath, data);
}

/** Apagar a modelo leva junto os links dela, porque o FK é ON DELETE CASCADE. */
export async function deleteModel(id: string): Promise<void> {
  const { error } = await supabase().from("models").delete().eq("id", id);
  if (error) throw new Error(readError(error));
}

async function setAvatar(id: string, avatarPath: string, previous: Model): Promise<Model> {
  const { data, error } = await supabase()
    .from("models")
    .update({ avatar_path: avatarPath })
    .select(MODEL_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(readError(error));
  return data ?? { ...previous, avatar_path: avatarPath };
}
