import { describe, expect, it } from "vitest";

import {
  UUID_RE,
  VALUE_EUR_MAX,
  euroToInput,
  formatEuro,
  normalizeDestinationUrl,
  normalizePixelId,
  parseEuro,
} from "@/lib/links";

describe("normalizePixelId", () => {
  it("aceita um id de pixel", () => {
    expect(normalizePixelId("1593499121650270")).toBe("1593499121650270");
  });

  it("tira espaço em volta", () => {
    expect(normalizePixelId("  1593499121650270  ")).toBe("1593499121650270");
  });

  it("aceita o formato colado de um link de preview", () => {
    expect(normalizePixelId("pixel_id=1593499121650270")).toBe("1593499121650270");
    expect(normalizePixelId("PIXEL_ID=1593499121650270")).toBe("1593499121650270");
  });

  it("recusa entrada vazia", () => {
    expect(normalizePixelId("")).toBeNull();
    expect(normalizePixelId("   ")).toBeNull();
    expect(normalizePixelId(null)).toBeNull();
    expect(normalizePixelId(undefined)).toBeNull();
  });

  // O id vai para dentro do `<script>` da página de entrega. Se um id não
  // numérico passasse, dava para fechar o script e executar código.
  it("recusa qualquer coisa que não seja dígito", () => {
    expect(normalizePixelId("12345abc")).toBeNull();
    expect(normalizePixelId("1593499121650270;alert(1)")).toBeNull();
    expect(normalizePixelId("' OR 1=1 --")).toBeNull();
    expect(normalizePixelId("</script><script>alert(1)</script>")).toBeNull();
  });

  it("recusa id curto demais e longo demais", () => {
    expect(normalizePixelId("1234")).toBeNull();
    expect(normalizePixelId("1".repeat(26))).toBeNull();
    expect(normalizePixelId("1".repeat(25))).toBe("1".repeat(25));
  });
});

describe("normalizeDestinationUrl", () => {
  it("completa https quando falta o protocolo", () => {
    expect(normalizeDestinationUrl("t.me/+abc")).toBe("https://t.me/+abc");
  });

  it("mantém http e https", () => {
    expect(normalizeDestinationUrl("https://t.me/abc")).toContain("https://t.me/abc");
    expect(normalizeDestinationUrl("http://exemplo.test/abc")).toContain("http://exemplo.test/abc");
  });

  // A linha vai direto para o href da âncora. Sem este filtro, uma linha
  // adulterada no banco transformava o /go em XSS.
  it("recusa esquemas que executam código", () => {
    expect(normalizeDestinationUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeDestinationUrl("JavaScript:alert(1)")).toBeNull();
    expect(normalizeDestinationUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeDestinationUrl("vbscript:msgbox(1)")).toBeNull();
    expect(normalizeDestinationUrl("file:///etc/passwd")).toBeNull();
  });

  it("recusa entrada vazia", () => {
    expect(normalizeDestinationUrl("")).toBeNull();
    expect(normalizeDestinationUrl("    ")).toBeNull();
  });
});

describe("parseEuro", () => {
  it("lê vírgula e ponto decimais", () => {
    expect(parseEuro("19,90")).toBe(19.9);
    expect(parseEuro("19.90")).toBe(19.9);
    expect(parseEuro("19")).toBe(19);
  });

  it("lê milhar com ponto", () => {
    expect(parseEuro("1.234,56")).toBe(1234.56);
    expect(parseEuro("1,234.56")).toBe(1234.56);
  });

  it("ignora o símbolo e os espaços", () => {
    expect(parseEuro("€ 19,90")).toBe(19.9);
    expect(parseEuro("19,90 €")).toBe(19.9);
  });

  it("devolve null para campo vazio, que é o estado de não informar valor", () => {
    expect(parseEuro("")).toBeNull();
    expect(parseEuro("    ")).toBeNull();
  });

  it("recusa texto", () => {
    expect(() => parseEuro("abc")).toThrow(/Valor inválido/);
  });

  it("recusa negativo", () => {
    expect(() => parseEuro("-5")).toThrow(/negativo/);
  });

  it("recusa acima do teto, que espelha o CHECK do banco", () => {
    expect(() => parseEuro(String(VALUE_EUR_MAX + 1))).toThrow(/no máximo/);
    expect(parseEuro(String(VALUE_EUR_MAX))).toBe(VALUE_EUR_MAX);
  });

  // Centavo que não existe vira ruído no relatório de receita.
  it("arredonda para duas casas", () => {
    expect(parseEuro("19,999")).toBe(20);
    expect(parseEuro("19,994")).toBe(19.99);
  });
});

describe("formatEuro e euroToInput", () => {
  it("formata em português", () => {
    expect(formatEuro(19.9)).toContain("19,90");
  });

  it("trata ausente como sem valor", () => {
    expect(formatEuro(null)).toBe("Sem valor");
    expect(formatEuro(undefined)).toBe("Sem valor");
  });

  it("leva o número cru para o campo de edição", () => {
    expect(euroToInput(19.9)).toBe("19.9");
    expect(euroToInput(null)).toBe("");
  });
});

describe("UUID_RE", () => {
  it("aceita o formato de id de link", () => {
    expect(UUID_RE.test("75534c00-a4b8-42e6-970e-2a0933d1194b")).toBe(true);
  });

  it("recusa o que a rota /go precisa rejeitar", () => {
    expect(UUID_RE.test("nao-e-uuid")).toBe(false);
    expect(UUID_RE.test("75534c00a4b842e6970e2a0933d1194b")).toBe(false);
    expect(UUID_RE.test("")).toBe(false);
  });
});
