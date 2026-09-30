import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guarda contra texto corrompido por encoding.
 *
 * Aconteceu aqui: um arquivo UTF-8 lido pelo PowerShell 5.1, que sem BOM usa o
 * ANSI do Windows, e gravado de volta como UTF-8. Cada acento virava dois
 * caracteres, e a página mostrava lixo no lugar do separador.
 *
 * A falha é silenciosa: o TypeScript compila, o lint passa, os testes passam.
 * Só aparece quando alguém lê a tela. Por isso precisa de teste.
 *
 * A assinatura vem logo abaixo. Ela não pode ser escrita aqui como exemplo
 * literal: o próprio comentário com o exemplo dispararia este teste.
 */

/** Um caractere latin1-supplement seguido de outro de U+0080-U+00BF. */
const MOJIBAKE = /[\u00C0-\u00FF][\u0080-\u00BF]/;

const IGNORADOS = new Set([
  "node_modules",
  ".output",
  ".vercel",
  ".wrangler",
  ".tanstack",
  ".git",
  ".lovable",
  ".opencode",
]);

const EXTENSOES = new Set([".ts", ".tsx", ".css", ".txt", ".json", ".html"]);

function arquivos(dir: string, out: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue;

    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) arquivos(caminho, out);
    else if (EXTENSOES.has(extname(entrada.name))) out.push(caminho);
  }
  return out;
}

const lista = [...arquivos("src"), ...arquivos("public")];

describe("encoding dos arquivos", () => {
  it("encontra arquivos para verificar", () => {
    // Sem isto o resto do arquivo passa no vazio e o teste vira teatro.
    expect(lista.length).toBeGreaterThan(20);
  });

  it("não tem byte inválido", () => {
    const ruins = lista.filter((arquivo) => readFileSync(arquivo, "utf8").includes("\uFFFD"));

    expect(ruins).toEqual([]);
  });

  it("não tem texto com codificação dupla", () => {
    const ruins: string[] = [];

    for (const arquivo of lista) {
      readFileSync(arquivo, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          if (MOJIBAKE.test(linha)) ruins.push(`${arquivo}:${i + 1}`);
        });
    }

    expect(ruins).toEqual([]);
  });

  it("não tem BOM", () => {
    const ruins = lista.filter((arquivo) => {
      const b = readFileSync(arquivo);
      return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    });

    expect(ruins).toEqual([]);
  });

  it("guarda os acentos que podem quebrar, para o teste não ficar vazio", () => {
    const comAcento = lista.filter((arquivo) =>
      /[áàâãéêíóôõúüç]/.test(readFileSync(arquivo, "utf8")),
    );

    expect(comAcento.length).toBeGreaterThan(5);
  });
});
