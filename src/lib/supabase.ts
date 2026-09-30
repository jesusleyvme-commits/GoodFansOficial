import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { supabaseFetch, supabasePublishableKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

function build(): SupabaseClient<Database> {
  const key = supabasePublishableKey();

  return createClient<Database>(supabaseUrl(), key, {
    global: { fetch: supabaseFetch(key) },
    auth: {
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Cliente Supabase do navegador. Toda consulta carrega o JWT do criador logado,
 * então a Row Level Security é a única barreira entre ele e os links dos outros.
 *
 * Não existe cliente com service-role no projeto. O token da Meta em claro é
 * lido por uma função SECURITY DEFINER no banco, que confere a posse com
 * `auth.uid()`: assim nenhuma credencial de administrador precisa existir no
 * ambiente, e a checagem não depende de o app lembrar de fazê-la.
 *
 * Só pode ser importado por rotas com `ssr: false` (/login e /dashboard). É
 * construído sob demanda, então em qualquer outro contexto ele nunca chega a
 * tocar o localStorage. O servidor do /go usa `resolve.server.ts`, à parte.
 */
export function supabase(): SupabaseClient<Database> {
  client ??= build();
  return client;
}
