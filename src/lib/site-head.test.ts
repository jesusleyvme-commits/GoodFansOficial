import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SITE_URL } from "@/lib/env";
import { pageHead, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-head";

function metaOf(head: ReturnType<typeof pageHead>, key: string, kind = "property") {
  const tag = head.meta.find((item) => item[kind as "property"] === key);
  return tag?.content;
}

afterEach(() => {
  delete process.env.VITE_SITE_URL;
  delete process.env.SITE_URL;
});

describe("pageHead: título", () => {
  it("acrescenta o nome do site uma vez só", () => {
    const head = pageHead({ title: "Entrar" });

    expect(head.meta.find((tag) => "title" in tag)?.title).toBe(`Entrar · ${SITE_NAME}`);
  });

  it("não duplica o nome quando o título já é o site", () => {
    const head = pageHead({ title: SITE_NAME });

    expect(head.meta.find((tag) => "title" in tag)?.title).toBe(SITE_NAME);
  });
});

describe("pageHead: Open Graph", () => {
  // O `<head>` do TanStack junta a rota filha com a mãe por chave. Se a rota
  // devolvesse só o title, o og:title da raiz sobreviveria e o preview
  // mostraria o nome de outra página.
  it("troca og:title e og:description junto com o título", () => {
    const head = pageHead({ title: "Modelos", path: "/dashboard/" });

    expect(metaOf(head, "og:title")).toBe(`Modelos · ${SITE_NAME}`);
    expect(metaOf(head, "og:description")).toBe(SITE_DESCRIPTION);
  });

  it("usa a descrição da página quando ela tem uma própria", () => {
    const head = pageHead({ title: "Login", description: "Entre na sua conta." });

    expect(metaOf(head, "og:description")).toBe("Entre na sua conta.");
    expect(metaOf(head, "description", "name")).toBe("Entre na sua conta.");
  });

  it("preenche as tags fixas do site", () => {
    const head = pageHead({ title: "Qualquer" });

    expect(metaOf(head, "og:site_name")).toBe(SITE_NAME);
    expect(metaOf(head, "og:type")).toBe("website");
    expect(metaOf(head, "og:locale")).toBe("pt_BR");
  });
});

describe("pageHead: URL canônica", () => {
  // A Meta só aceita URL absoluta, e o mesmo link compartilhado em dois
  // lugares precisa gerar a mesma tag.
  it("gera og:url absoluto a partir do domínio do site", () => {
    const head = pageHead({ title: "Pessoas", path: "/dashboard/admin" });

    expect(metaOf(head, "og:url")).toBe(`${DEFAULT_SITE_URL}/dashboard/admin`);
  });

  it("gera canonical com a mesma URL de og:url", () => {
    const head = pageHead({ title: "Links", path: "/dashboard/models/abc" });

    const canonical = head.links.find((link) => link.rel === "canonical");
    expect(canonical?.href).toBe(metaOf(head, "og:url"));
  });

  it("aceita caminho de página inteira", () => {
    const head = pageHead({ title: "Links", path: "/dashboard/models/75534c00-a4b8-42e6" });

    expect(metaOf(head, "og:url")).toBe(`${DEFAULT_SITE_URL}/dashboard/models/75534c00-a4b8-42e6`);
  });

  it("não deixa barra duplicada na raiz", () => {
    const head = pageHead({ title: SITE_NAME });

    expect(metaOf(head, "og:url")).toBe(`${DEFAULT_SITE_URL}/`);
  });

  it("respeita VITE_SITE_URL quando definido", () => {
    process.env.VITE_SITE_URL = "https://exemplo.test/";

    const head = pageHead({ title: "Login", path: "/login" });

    expect(metaOf(head, "og:url")).toBe("https://exemplo.test/login");
  });
});

describe("pageHead: Twitter", () => {
  it("preenche title e description", () => {
    const head = pageHead({ title: "Entrar", description: "Entre na sua conta." });

    expect(metaOf(head, "twitter:card", "name")).toBe("summary");
    expect(metaOf(head, "twitter:title", "name")).toBe(`Entrar · ${SITE_NAME}`);
    expect(metaOf(head, "twitter:description", "name")).toBe("Entre na sua conta.");
  });
});
