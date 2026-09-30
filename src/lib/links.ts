/** IDs de Meta Pixel são inteiros sem sinal. Qualquer outra coisa é rejeitada na hora. */
const PIXEL_ID_RE = /^\d{5,25}$/;

export function normalizePixelId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value
    .trim()
    .replace(/^pixel_id=/i, "")
    .trim();
  return PIXEL_ID_RE.test(trimmed) ? trimmed : null;
}

/**
 * Só destinos http(s) são seguidos. `javascript:`, `data:` e afins são
 * descartados, para que uma linha adulterada no banco nunca transforme o
 * /go/[id] em um vetor de XSS.
 */
export function normalizeDestinationUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Teto espelhado do CHECK do banco, para a UI recusar antes de gravar. */
export const VALUE_EUR_MAX = 1_000_000;

const EURO_FORMAT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(value: number | null | undefined): string {
  return value === null || value === undefined ? "Sem valor" : EURO_FORMAT.format(value);
}

/**
 * Aceita "19,90" e "19.90". Um `input type="number"` só entende ponto, então em
 * teclado pt-BR o usuário precisaria trocar o separador paraSubmit, e por isso o
 * campo é `text` com `inputMode="decimal"`.
 *
 * Devolve null para campo vazio, que é o estado "não informar valor".
 */ export function parseEuro(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace("€", "");
  if (trimmed === "") return null;

  // Só a última vírgula conta como decimal: "1.234,56" tem que virar 1234.56.
  const normalized =
    trimmed.includes(",") && trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.replace(/,/g, "");

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error("Valor inválido. Use números, por exemplo 19,90.");
  if (parsed < 0) throw new Error("O valor não pode ser negativo.");
  if (parsed > VALUE_EUR_MAX) {
    throw new Error(`O valor pode ser no máximo ${formatEuro(VALUE_EUR_MAX)}.`);
  }

  // Duas casas: a Meta recebe o valor como decimal, e centavos que não existem
  // viram ruído no relatório de receita.
  return Math.round(parsed * 100) / 100;
}

/** Formato de edição: só o número, para o campo poder ser reescrito à vontade. */
export function euroToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
