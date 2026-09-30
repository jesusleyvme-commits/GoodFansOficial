/**
 * Bucket de avatar e montagem da URL pública.
 *
 * Fica num módulo sem o cliente do Supabase de propósito: `avatars.ts` precisa
 * dele para upload, e a rota /go roda no servidor, onde arrastar o cliente de
 * navegador só aumentaria o bundle e criaria uma dependência que não existe no
 * runtime do servidor. Os dois lados precisam da mesma string, então ela nasce
 * aqui.
 */
export const AVATAR_BUCKET = "avatars";

/**
 * URL absoluta da foto, ou null se o modelo não tem foto.
 *
 * O bucket `avatars` é público, então o `<img>` da página /go carrega sem
 * token. Só aceita caminho relativo dentro do bucket: um valor que comece com
 * `//` ou traga `://` faria o navegador buscar em outro host, e isso é
 * exatamente o vetor de rastreamento de visitante que a página não deve ter.
 */
export function publicAvatarUrl(
  supabaseUrl: string,
  path: string | null | undefined,
): string | null {
  const clean = path?.trim();
  if (!clean) return null;
  if (clean.startsWith("/") || clean.includes("..") || /^[a-z][a-z0-9+.-]*:/i.test(clean)) return null;

  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${clean}`;
}
