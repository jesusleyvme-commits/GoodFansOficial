import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";

export type PayoutDetails = {
  holderName: string;
  iban: string;
  pixKey: string;
  mbwayPhone: string;
  /** null enquanto nunca foi salvo. */
  updatedAt: string | null;
};

const VAZIO: PayoutDetails = {
  holderName: "",
  iban: "",
  pixKey: "",
  mbwayPhone: "",
  updatedAt: null,
};

/**
 * Lê os dados de recebimento do creator.
 *
 * Os valores vêm em claro porque o usuário acabou de digitá-los e precisa
 * conferi-los; é o mesmo tradeoff do botão de olho no token da Meta. Em troca, a
 * tabela não tem policy de leitura e não tem privilégio de SELECT para ninguém:
 * o caminho para o texto claro é esta função, e ela só devolve a linha de quem
 * está logado.
 *
 * Sem linha salva, devolve um objeto vazio em vez de erro — "ainda não preenchi"
 * é o estado normal de quem está chegando na tela pela primeira vez.
 */
export async function loadPayoutDetails(): Promise<PayoutDetails> {
  const { data, error } = await supabase().rpc("reveal_payout_details");

  if (error) throw new Error(readError(error));

  const row = data?.[0];
  if (!row) return VAZIO;

  return {
    holderName: row.holder_name ?? "",
    iban: row.iban ?? "",
    pixKey: row.pix_key ?? "",
    mbwayPhone: row.mbway_phone ?? "",
    updatedAt: row.updated_at,
  };
}

export type SavePayoutInput = Omit<PayoutDetails, "updatedAt">;

/**
 * Grava os dados de recebimento.
 *
 * Os espaços saem antes de enviar: IBAN e telefone vêm colados do app do banco
 * e o espaço faria o banco recusar um dado que estava certo. O resto da
 * validação é do Postgres, e a mensagem dele chega na tela.
 */
export async function savePayoutDetails(input: SavePayoutInput): Promise<void> {
  const { error } = await supabase().rpc("save_payout_details", {
    p_holder_name: input.holderName.trim() || null,
    p_iban: input.iban.trim() || null,
    p_pix_key: input.pixKey.trim() || null,
    p_mbway_phone: input.mbwayPhone.trim() || null,
  });

  if (error) throw new Error(readError(error));
}
