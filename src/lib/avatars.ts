import { supabase } from "@/lib/supabase";
import { readError } from "@/lib/links-api";
import { supabaseUrl } from "@/lib/env";
import { AVATAR_BUCKET, publicAvatarUrl } from "@/lib/avatar-path";

export { AVATAR_BUCKET };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * O primeiro segmento do caminho é o dono, que é exatamente o que a policy de
 * storage compara com auth.uid(). Por isso o cliente escolhe só o nome do
 * arquivo. O resto do caminho é montado aqui.
 */
function buildPath(ownerId: string, fileName: string, file: File): string {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Use uma imagem JPG, PNG, WebP ou GIF.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("A imagem passa de 2 MB. Escolha uma menor.");

  return `${ownerId}/${fileName}.${extension}`;
}

/** Caminho guardado no banco, para ser reaproveitado quando não há upload novo. */
export function avatarUrl(path: string | null | undefined): string | null {
  return publicAvatarUrl(supabaseUrl(), path);
}

export async function uploadAvatar(ownerId: string, fileName: string, file: File): Promise<string> {
  const path = buildPath(ownerId, fileName, file);

  const { error } = await supabase().storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(readError({ message: error.message }));
  return path;
}

/** Apagar o arquivo antigo evita deixar lixo quando a extensão muda. */
export async function removeAvatar(path: string | null | undefined): Promise<void> {
  if (!path) return;

  const { error } = await supabase().storage.from(AVATAR_BUCKET).remove([path]);
  // Falhar em limpar o arquivo antigo não deve impedir a troca da foto.
  if (error) console.warn(`[avatar] nao foi possivel remover ${path}: ${error.message}`);
}
