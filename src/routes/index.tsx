import { createFileRoute } from "@tanstack/react-router";

/** O produto não tem páginas públicas: toda visita vai direto para o painel. */
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 302,
          headers: { location: "/dashboard", "cache-control": "no-store" },
        }),
    },
  },
});
