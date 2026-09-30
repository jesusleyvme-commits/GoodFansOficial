import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuração separada do `vite.config.ts` de propósito: aquele arquivo é
// gerido pelo preset do Lovable e o cabeçalho dele pede para não ser alterado.
// Aqui só entra o que o Vitest precisa — principalmente o alias `@`, que os
// plugins do preset não alcançam.
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
