import { describe, expect, it } from "vitest";

import { META_TOKEN_MAX, META_TOKEN_MIN, normalizeMetaToken } from "@/lib/meta-token";

const TOKEN = "EAABwzLixnjYBO7ZBqZBmZC1OnZC3ZBqZBmZC1OnZC3ZBqZBmZC1OnZC3ZB";

describe("normalizeMetaToken", () => {
  it("aceita um token do Graph API", () => {
    expect(normalizeMetaToken(TOKEN)).toBe(TOKEN);
  });

  // O token costuma vir colado com espaço ou quebra de linha da tela da Meta.
  it("tira o espaço em volta", () => {
    expect(normalizeMetaToken(`  ${TOKEN}\n`)).toBe(TOKEN);
  });

  it("devolve null para campo vazio, que é apagar o token", () => {
    expect(normalizeMetaToken("")).toBeNull();
    expect(normalizeMetaToken("    ")).toBeNull();
  });

  it("recusa token curto demais", () => {
    expect(() => normalizeMetaToken("curto")).toThrow(/curto demais/);
  });

  it("recusa token longo demais", () => {
    expect(() => normalizeMetaToken("a".repeat(META_TOKEN_MAX + 1))).toThrow(/longo demais/);
  });

  it("aceita as pontas dos limites", () => {
    expect(normalizeMetaToken("a".repeat(META_TOKEN_MIN))).toHaveLength(META_TOKEN_MIN);
    expect(normalizeMetaToken("a".repeat(META_TOKEN_MAX))).toHaveLength(META_TOKEN_MAX);
  });

  // O token é uma credencial da conta de anúncios: ele vai para a Meta pelo
  // servidor e nunca deve ser normalized de um jeito que mude o valor.
  it("não mexe no conteúdo do token", () => {
    const comBarra = `${TOKEN}|extra`;
    expect(normalizeMetaToken(comBarra)).toBe(comBarra);
  });
});
