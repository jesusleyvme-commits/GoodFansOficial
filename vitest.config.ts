import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuração separada do `vite.config.ts` de propósito: aquele monta o app e
// o servidor, e o Vitest só precisa do alias `@` e de onde procurar os testes.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
