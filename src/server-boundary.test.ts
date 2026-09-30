import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nenhum módulo que roda no navegador importa um `*.server.ts` no topo.
 *
 * Existe porque a proteção do Vite não pode ser usada aqui. O
 * `importProtection` do TanStack Start é análise estática do grafo e recusa que
 * um `*.server.ts` chegue ao cliente — mas um módulo com `createServerFn` é
 * importado estaticamente por um componente de propósito, e é o plugin que
 * tira o corpo da função do bundle. Ligar a proteção quebraria o botão de olho
 * do token sem impedir nenhum vazamento real.
 *
 * Então a regra vira teste, que é o que dá para obedecer de verdade: a
 * convenção passa a ser verificada no build em vez de ser uma crença.
 *
 * O que este teste **não** cobre, e é preciso saber: ele olha só o topo do
 * arquivo. Um `import()` dentro de uma função passa, e é o comportamento
 * desejado no caso do botão de olho, que carrega o módulo no clique. O
 * isolamento que de fato importa é a RLS, e ela é testada no banco.
 */
const IGNORADOS = new Set(["node_modules", ".output", ".vercel", ".wrangler", ".tanstack", ".git"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue;
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) walk(caminho, out);
    else if (extname(entrada.name)) out.push(caminho);
  }
  return out;
}

/** Linhas de topo: fora de função e fora de `import()` dinâmico. */
function importsDoTopo(texto: string): string[] {
  const imports: string[] = [];
  let profundidade = 0;

  for (const linha of texto.split("\n")) {
    // `import()` dentro de uma função não conta, e é o que este teste permite.
    if (/^\s*const\s*\{[^}]*\}\s*=\s*await\s+import\(/.test(linha)) continue;
    if (/await\s+import\(/.test(linha)) continue;

    const abre = (linha.match(/{/g) ?? []).length;
    const fecha = (linha.match(/}/g) ?? []).length;

    if (profundidade === 0) {
      const m = linha.match(/^\s*(?:import|export)\b[^"']*from\s*["']([^"']+)["']/);
      if (m) imports.push(m[1]);
      if (/^\s*import\s*["'][^"']+["']/.test(linha)) imports.push(linha);
    }

    profundidade += abre - fecha;
    if (profundidade < 0) profundidade = 0;
  }

  return imports;
}

const arquivos = walk("src");

describe("limite entre servidor e navegador", () => {
  it("tem arquivos para varrer", () => {
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it("nenhum módulo importa um *.server.ts no topo", () => {
    const violacoes: string[] = [];

    for (const arquivo of arquivos) {
      if (arquivo.endsWith(".server.ts")) continue;
      if (extname(arquivo) !== ".ts" && extname(arquivo) !== ".tsx") continue;

      const texto = readFileSync(arquivo, "utf8");

      for (const specifier of importsDoTopo(texto)) {
        if (/\.server(\.[tj]sx?)?$/.test(specifier) || /\.server\//.test(specifier)) {
          violacoes.push(`${relative(".", arquivo)} -> ${specifier}`);
        }
      }
    }

    expect(violacoes).toEqual([]);
  });

  it("os módulos de servidor existem mesmo, para o teste não ficar vazio", () => {
    const servidores = arquivos.filter((f) => f.endsWith(".server.ts"));
    expect(servidores.length).toBeGreaterThan(0);
  });
});
