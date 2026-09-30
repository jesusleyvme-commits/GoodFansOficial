import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { pageHead } from "@/lib/site-head";

const ROOT_HEAD = pageHead({ title: "GoodFans" });

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#05060a" },
      // O painel é privado: o robô não tem o que indexar aqui. Isso não impede
      // o preview do link em mensageiro, que é o que as tags Open Graph fazem.
      { name: "robots", content: "noindex, nofollow" },
      // Só os `meta`. A URL canônica fica em cada rota filha porque, ao
      // contrário das tags, os `links` do head são empilhados em vez de
      // substituídos: canônico na raiz e na folha daria dois <link> para a
      // mesma página, e o buscador escolheria um dos dois nobres.
      ...ROOT_HEAD.meta,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument() {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
