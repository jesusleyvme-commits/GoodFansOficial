import { siteUrl } from "@/lib/env";

export const SITE_NAME = "GoodFans";

export const SITE_DESCRIPTION =
  "Links de entrega com validação de acesso e rastreamento de conversão para a Meta.";

/**
 * Tags de `<head>` de uma página, com Open Graph e Twitter já preenchidos.
 *
 * Existe como função porque o `<head>` do TanStack junta a rota filha com a
 * mãe por chave de tag: se a rota filha devolvesse só o `title`, o `og:title`
 * da raiz continuaria valendo e o preview mostraria o nome da página errada.
 * Montar o conjunto inteiro em um lugar só é o que impede a tag pela metade.
 *
 * `og:url` e `canonical` são absolutos de propósito. O `event_source_url` que
 * vai para a Meta também precisa ser completo, e a Meta só aceita URL absoluta.
 */
export type PageMeta = {
  /** Título da aba. O nome do site é acrescentado aqui, uma vez só. */
  title: string;
  description?: string;
  /** Caminho dentro do site. A raiz é "/". */
  path?: string;
};

export function pageHead({ title, description = SITE_DESCRIPTION, path = "/" }: PageMeta) {
  const url = new URL(path, `${siteUrl()}/`).toString();
  const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      // "summary" sem imagem: o preview mostra título e descrição em vez de um
      // cartão quebrado apontando para um arquivo que não existe.
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
