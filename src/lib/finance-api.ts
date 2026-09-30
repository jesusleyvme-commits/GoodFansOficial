import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";

export type FinanceRow = {
  linkId: string;
  modelId: string;
  productName: string;
  /** null quando o link não tem valor configurado. */
  valueEur: number | null;
  conversions: number;
  /** Conversões que a Meta aceitou. O resto falhou no envio e não foi contado. */
  sentToMeta: number;
  /** Coletas do gate aceitas. Zero em link sem formulário. */
  leads: number;
  firstConversionAt: string | null;
  lastConversionAt: string | null;
};

export type FinanceSummary = {
  rows: FinanceRow[];
  totals: {
    conversions: number;
    sentToMeta: number;
    leads: number;
    /** Soma das conversões × o valor configurado em cada link. */
    estimatedEur: number;
    /** Soma só dos links que têm valor, para o denominador não ser enganoso. */
    linksWithValue: number;
  };
};

/** O PostgREST devolve numeric como string, para não perder precisão. */
function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resumo financeiro do creator.
 *
 * A soma em euros é uma estimativa feita aqui, e não um valor cobrado: é
 * contagem × o valor que o creator digitou no link. Quem fecha o faturamento é
 * a Meta, e o valor real de uma venda depende do que o comprador pagou de fato.
 * A tela diz isso na própria página, porque um número sem essa ressalva vira
 * decisão comercial errada.
 */
export async function loadFinanceSummary(): Promise<FinanceSummary> {
  const { data, error } = await supabase().rpc("finance_summary");

  if (error) throw new Error(readError(error));

  const rows: FinanceRow[] = (data ?? []).map((row) => ({
    linkId: row.link_id,
    modelId: row.model_id,
    productName: row.product_name,
    valueEur: toNumber(row.value_eur),
    conversions: Number(row.conversions ?? 0),
    sentToMeta: Number(row.sent_to_meta ?? 0),
    leads: Number(row.leads ?? 0),
    firstConversionAt: row.first_conversion_at,
    lastConversionAt: row.last_conversion_at,
  }));

  const totals = rows.reduce(
    (acc, row) => {
      acc.conversions += row.conversions;
      acc.sentToMeta += row.sentToMeta;
      acc.leads += row.leads;
      if (row.valueEur !== null) {
        acc.estimatedEur += row.valueEur * row.conversions;
        acc.linksWithValue += 1;
      }
      return acc;
    },
    { conversions: 0, sentToMeta: 0, leads: 0, estimatedEur: 0, linksWithValue: 0 },
  );

  return { rows, totals };
}

/** Euro com duas casas, sem depender de locale do navegador. */
export function formatEur(value: number): string {
  return `€ ${value.toFixed(2).replace(".", ",")}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}
