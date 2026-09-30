import { removeAvatar, uploadAvatar } from "@/lib/avatars";
import { readError, requireUserId } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

// `meta_token_encrypted` fica de fora de propósito: a UI só precisa saber se há
// um token configurado, e o valor cifrado não tem por que chegar ao navegador.
// `is_admin` e `approved_at` entram porque o menu e o estado de espera dependem
// deles, e ambos são do próprio usuário — a RLS não deixa ler a linha de mais
// ninguém.
const PROFILE_SELECT =
  "id, username, display_name, avatar_path, meta_pixel_id, has_meta_token, is_admin, approved_at, deactivated_at, rejected_at, created_at, updated_at";

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase().from("profiles").select(PROFILE_SELECT).maybeSingle();

  if (error) throw new Error(readError(error));
  return data;
}

export type ProfileInput = {
  displayName: string;
  avatar: File | null;
};

export async function saveProfileIdentity(input: ProfileInput): Promise<Profile> {
  const id = await requireUserId();

  const displayName = input.displayName.trim() || null;

  const { data, error } = await supabase()
    .from("profiles")
    .upsert({ id, display_name: displayName }, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .single();

  if (error) throw new Error(readError(error));
  if (!input.avatar) return data;

  const avatarPath = await uploadAvatar(id, "perfil", input.avatar);

  if (data.avatar_path && data.avatar_path !== avatarPath) {
    await removeAvatar(data.avatar_path);
  }

  const { data: updated, error: updateError } = await supabase()
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .select(PROFILE_SELECT)
    .eq("id", id)
    .single();

  if (updateError) throw new Error(readError(updateError));
  return updated ?? { ...data, avatar_path: avatarPath };
}
