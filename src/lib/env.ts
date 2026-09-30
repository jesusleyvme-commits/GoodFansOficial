/**
 * Único lugar que sabe de onde vêm as credenciais do Supabase.
 *
 * O mesmo módulo roda em dois ambientes bem diferentes:
 *  - navegador: o Vite só embute variáveis com prefixo `VITE_`, via `import.meta.env`
 *  - servidor:   o runtime Nitro/Cloudflare expõe `process.env` puro
 */

type EnvBag = Record<string, string | undefined>;

const URL_VARS = ["VITE_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_PROJECT_URL"] as const;
const KEY_VARS = [
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
] as const;

function readEnv(...names: readonly string[]): string | undefined {
  const bags: EnvBag[] = [];

  if (typeof process !== "undefined") bags.push(process.env as EnvBag);
  bags.push(((import.meta as { env?: EnvBag }).env ?? {}) as EnvBag);

  for (const bag of bags) {
    for (const name of names) {
      const value = bag[name];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
  }

  return undefined;
}

export function supabaseUrl(): string {
  const url = readEnv(...URL_VARS);
  if (!url)
    throw new Error(
      `Variável de ambiente do Supabase ausente. Defina uma: ${URL_VARS.join(", ")}.`,
    );
  return url;
}

export function supabasePublishableKey(): string {
  const key = readEnv(...KEY_VARS);
  if (!key)
    throw new Error(
      `Variável de ambiente do Supabase ausente. Defina uma: ${KEY_VARS.join(", ")}.`,
    );
  return key;
}

/**
 * As chaves modernas do Supabase (`sb_publishable_` / `sb_secret_`) são opacas,
 * não JWTs. Enviar a publishable como `Authorization: Bearer` faz o PostgREST
 * rejeitar a requisição, então o header precisa ser removido antes de sair.
 */
export function isOpaqueSupabaseKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

export function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, headerKey) => headers.set(headerKey, value));
    }

    if (isOpaqueSupabaseKey(key) && headers.get("authorization") === `Bearer ${key}`) {
      headers.delete("authorization");
    }

    headers.set("apikey", key);

    return fetch(input, { ...init, headers });
  };
}

/**
 * Domínio público do app, sem barra final.
 *
 * Fica em variável de ambiente porque Open Graph e URL canônica precisam de um
 * endereço absoluto e fixo: se fossem montados a partir da requisição, cada
 * preview carregaria o host que chamou, e o mesmo link compartilhado em dois
 * lugares geraria duas tags diferentes.
 */
export const DEFAULT_SITE_URL = "https://goodfansoficial.vercel.app";

export function siteUrl(): string {
  return (readEnv("VITE_SITE_URL", "SITE_URL") ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}
