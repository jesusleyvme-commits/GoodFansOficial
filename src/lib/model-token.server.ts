import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientAsUser } from "@/lib/user-client.server";

const Params = z.object({
  modelId: z.string().uuid(),
  accessToken: z.string().min(1),
});

/**
 * Devolve o token em claro de uma modelo, e só quando o dono pede.
 *
 * A posse é conferida no banco: `reveal_model_meta_token` roda como SECURITY
 * DEFINER e compara `auth.uid()` com o `owner_id` da modelo, então o papel da
 * requisição é `authenticated` e a RLS continua valendo para todo o resto.
 *
 * Isso abre mão de uma proteção que o resto do app mantinha: até aqui o token
 * vivia cifrado e nunca voltava ao navegador. Agora ele chega à tela de quem está
 * logado, o que significa que qualquer script que rode na página, ou um
 * dispositivo compartilhado sem logout, enxerga a credencial da conta de anúncios.
 * O botão de olho existe por pedido, então o risco é dele mesmo.
 */
export const revealModelToken = createServerFn({ method: "POST" })
  .inputValidator(Params)
  .handler(async ({ data }): Promise<{ token: string | null }> => {
    const { data: token, error } = await clientAsUser(data.accessToken).rpc(
      "reveal_model_meta_token",
      { p_model_id: data.modelId },
    );

    if (error) {
      // 42501 é o "não é sua" que a função levanta. A mensagem não distingue id
      // inexistente de id de outra pessoa, para não confirmar nada sobre a linha.
      if (error.code === "42501") throw new Error("Essa modelo não é sua.");
      throw new Error(error.message);
    }

    return { token: typeof token === "string" && token !== "" ? token : null };
  });
