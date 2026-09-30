import type { Database } from "@/lib/database.types";
import { readError } from "@/lib/links-api";
import { requireUserId } from "@/lib/require-user";
import { supabase } from "@/lib/supabase";

/**
 * O construtor da página de entrega é um só por creator.
 *
 * Fica em `page_settings`, não em `delivery_links`: a página que o visitante vê
 * é a cara da conta, e não muda de uma publicity para outra. Guardar por link
 * obrigava a remontar a mesma tela toda vez que se criava um link novo, e o
 * primeiro link criado ficava com uma página diferente da segunda — que é
 * exatamente o que ninguém percebe até mandar um errado no ar.
 */
export type PageSettings = {
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  /** null usa o texto padrão do app. */
  headline: string | null;
  subhead: string | null;
  privacyNote: string | null;
};

/** O que o app usa quando o creator não escreveu nada. */
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  collectName: true,
  collectEmail: true,
  collectPhone: true,
  headline: null,
  subhead: null,
  privacyNote: null,
};

/**
 * Lê o construtor do creator.
 *
 * Sem linha gravada, devolve os padrões em vez de null: quem acabou de criar a
 * conta tem que ver a página cheia no preview, não um formulário vazio com três
 * caixas desligadas.
 */
export async function getPageSettings(): Promise<PageSettings> {
  const { data, error } = await supabase().rpc("get_page_settings");
  if (error) throw new Error(readError(error));

  const row = data?.[0] as Database["public"]["Functions"]["get_page_settings"]["Returns"][0] | undefined;
  if (!row) return DEFAULT_PAGE_SETTINGS;

  return {
    collectName: row.collect_name !== false,
    collectEmail: row.collect_email !== false,
    collectPhone: row.collect_phone !== false,
    headline: row.headline,
    subhead: row.subhead,
    privacyNote: row.privacy_note,
  };
}

export type PageSettingsInput = PageSettings;

/**
 * Grava o construtor.
 *
 * Vai por RPC e não por `update` na tabela porque a posse é conferida no banco,
 * com auth.uid(), dentro da função. A tabela está sem privilégio direto para o
 * `authenticated` justamente para não haver dois lugares decidindo autorização.
 */
export async function updatePageSettings(input: PageSettingsInput): Promise<PageSettings> {
  await requireUserId();

  const clean = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    // Vazio é o jeito de voltar ao texto padrão do app. Enviando "" o banco
    // gravaria string vazia e a página ficaria sem título.
    return trimmed ? trimmed : null;
  };

  const { error } = await supabase().rpc("update_page_settings", {
    p_collect_name: input.collectName,
    p_collect_email: input.collectEmail,
    p_collect_phone: input.collectPhone,
    p_headline: clean(input.headline),
    p_subhead: clean(input.subhead),
    p_privacy_note: clean(input.privacyNote),
  });

  if (error) throw new Error(readError(error));

  return { ...input, ...cleaned(input) };
}

function cleaned(input: PageSettingsInput): PageSettings {
  return {
    collectName: input.collectName,
    collectEmail: input.collectEmail,
    collectPhone: input.collectPhone,
    headline: input.headline?.trim() || null,
    subhead: input.subhead?.trim() || null,
    privacyNote: input.privacyNote?.trim() || null,
  };
}
