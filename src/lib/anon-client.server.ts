import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { supabaseFetch, supabasePublishableKey, supabaseUrl } from "@/lib/env";

let anon: SupabaseClient<Database> | undefined;

/**
 * Cliente no papel `anon`, memoizado.
 *
 * A rota /go é pública: quem compra não está logado, então este é o único papel
 * disponível para ela. Existe aqui, e não duplicado em cada módulo que fala com
 * o banco de fora, para que a política de conexão valha para todos: um cliente
 * novo por requisição perde o pool e qualquer timeout padrão.
 */
export function anonClient(): SupabaseClient<Database> {
  if (anon) return anon;

  const key = supabasePublishableKey();
  anon = createClient<Database>(supabaseUrl(), key, {
    global: { fetch: supabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  return anon;
}
