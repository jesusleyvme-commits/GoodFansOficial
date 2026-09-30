import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Cliente no papel `authenticated`, com o JWT de quem está chamando.
 *
 * A service-role resolveria o mesmo problema, mas ela ignora a RLS: aí a posse
 * precisaria ser conferida à mão em cada consulta, e um erro esquecido devolveria
 * o token da conta de anúncios de outra pessoa. Aqui a checagem é o próprio
 * banco, e nenhuma credencial de administrador existe no ambiente do app.
 *
 * O header é injetado no fetch em vez de vir de `global.headers` porque o
 * supabase-js reescreve o `Authorization` a partir da sessão, e aqui não há
 * sessão: só o token que o navegador mandou.
 */
export function clientAsUser(accessToken: string): SupabaseClient<Database> {
  const key = supabasePublishableKey();

  const fetchAsUser: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, headerKey) => headers.set(headerKey, value));
    }

    headers.set("apikey", key);
    headers.set("Authorization", `Bearer ${accessToken}`);

    return fetch(input, { ...init, headers });
  };

  return createClient<Database>(supabaseUrl(), key, {
    global: { fetch: fetchAsUser },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
