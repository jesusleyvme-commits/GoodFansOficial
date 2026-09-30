import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type PluginOption } from "vite";

/**
 * Configuração do build, escrita à mão.
 *
 * Este arquivo passou a ser o controle do projeto. O `vite.config.ts` original
 * vinha de um pacote de terceiros que registrava estes mesmos plugins e mais
 * alguns de uso interno daquele editor; trocar por este deixa a build inteira
 * em um arquivo que dá para ler.
 *
 * O que foi retirado e por quê:
 * - devtools: painel de depuração daquele editor, só rodava em `vite dev`
 * - loggers de `serverFn`/`ssr`: subiam o erro para um serviço externo
 * - `hmrGate` e `devServerBridge`: ponte do ambiente de preview dele
 * - proxy de assets: só servia o que rodava dentro daquele sandbox
 *
 * `importProtection` fica desligado, e este é o ponto que exige justificativa.
 *
 * Ele liga sozinho, por padrão, recusando que um `*.server.ts` entre no grafo
 * do cliente. Não dá para usar aqui: um módulo com `createServerFn` é importado
 * estaticamente por um componente de cliente de propósito, e é o plugin que
 * remove o corpo da função do bundle. A proteção é análise estática do grafo e
 * não distingue isso, então ligá-la quebra o botão de olho do token e não
 * impede nenhum vazamento real. O preset antigo só não quebrava porque
 * sobrescrevia o padrão com um que não casava com nada.
 *
 * O isolamento de verdade é a RLS no banco, e ele é testado. O que este
 * projeto garante por convenção — componente de cliente não importa
 * `*.server.ts` no topo do arquivo — é conferido por
 * `src/server-boundary.test.ts`, que falha se alguém importar.
 */
export default defineConfig(async ({ command, mode }) => {
  // `VITE_` é o prefixo que o Vite embute no bundle. Como o `define` é
  // montado à mão, é aqui que a variável chega ao `import.meta.env`.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};

  for (const [chave, valor] of Object.entries(env)) {
    envDefine[`import.meta.env.${chave}`] = JSON.stringify(valor);
  }

  const plugins: PluginOption[] = [tailwindcss()];

  // O nitro monta a saída de produção e entra em conflito com o servidor do
  // Vite, então ele só é registrado quando o comando é `build`.
  if (command === "build") {
    const { nitro } = (await import("nitro/vite")) as typeof import("nitro/vite");
    plugins.push(nitro());
  }

  plugins.push(
    tanstackStart({
      // Desligado porque não é utilizável com `createServerFn`. A razão está
      // escrita no comentário do topo deste arquivo, e o que substitui a
      // cobertura está em `src/server-boundary.test.ts`.
      importProtection: { enabled: false },
    }),
  );

  // `react` vem depois do `tanstackStart`, nunca antes: o plugin do router
  // recusa a configuração se um transformador de JSX aparecer antes dele, e o
  // erro sai na hora de resolver a config, antes do `ready`.
  //
  // E ele não pode faltar: é o que serve `/@react-refresh`, que o cliente de dev
  // do TanStack Start exige. Sem ele o server sobe, responde 500 em
  // `/@id/virtual:tanstack-start-dev-client-entry` e o preview morre. Quem
  // trazia esse plugin antes era o preset, então nada mais o registrava.
  plugins.push(react());

  return {
    plugins,

    define: envDefine,

    resolve: {
      // O Vite 8 resolve os `paths` do `tsconfig.json` sozinho, e avisa para
      // tirar o `vite-tsconfig-paths` quando ele detecta o plugin. Já saiu.
      tsconfigPaths: true,
      // O alias `@` fica aqui e no `vitest.config.ts`; o `tsconfig.json` também
      // declara, e os três precisam concordar.
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      // Sem isto o React e o TanStack Query aparecem duplicados quando um
      // pacote resolve por caminho diferente, e o resultado é erro de hook.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
  };
});
