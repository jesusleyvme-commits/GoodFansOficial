import { describe, expect, it } from "vitest";

import { escapeHtml, renderRedirectPage, renderUnavailablePage } from "@/lib/redirect-page";

const LINK_ID = "75534c00-a4b8-42e6-970e-2a0933d1194b";
const EVENT_ID = "463ee298-48dc-4005-818e-314e34030e14";

function page(overrides: Partial<Parameters<typeof renderRedirectPage>[0]> = {}) {
  return renderRedirectPage({
    destination: "https://t.me/+abc",
    pixelId: "1593499121650270",
    productName: "Masterclass",
    valueEur: 35,
    linkId: LINK_ID,
    eventId: EVENT_ID,
    ...overrides,
  });
}

describe("escapeHtml", () => {
  it("cobre os cinco caracteres que importam", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("não deixa passar nada que abra uma tag ou atributo", () => {
    const hostile = `"><script>alert('xss')</script><img src=x onerror=alert(1)>`;
    const escaped = escapeHtml(hostile);

    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
  });
});

describe("renderRedirectPage: documento", () => {
  it("entrega HTML completo em português", () => {
    const html = page();

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="robots" content="noindex,nofollow"');
  });

  it("recusa destino que não seja http(s)", () => {
    expect(() => page({ destination: "javascript:alert(1)" })).toThrow(/http\(s\)/);
  });
});

describe("renderRedirectPage: escape de quem manda", () => {
  // O nome do produto vem de digitação de usuário e vai para o <title>, para o
  // <p> e para o texto do botão.
  it("escapa nome de produto com HTML", () => {
    const html = page({ productName: `<script>alert('x')</script>` });

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa aspas no nome, para não fechar atributo", () => {
    const html = page({ productName: `" onmouseover="alert(1)` });

    expect(html).not.toContain(`onmouseover="alert(1)"`);
    expect(html).toContain("&quot;");
  });
});

describe("renderRedirectPage: deduplicação", () => {
  // A Meta conta uma conversão só quando o pixel do navegador e o evento de
  // servidor carregam o mesmo event_id. Se divergirem, contam duas.
  it("usa o mesmo event_id no fbq e no beacon", () => {
    const html = page();

    // Aceita as duas aspas porque o que importa é o id, não o estilo de
    // citação: o literal passa por JSON.stringify, não por escape de atributo.
    const beacon = html.match(/eventId:\s*["']([0-9a-f-]{36})["']/);
    const fbq = html.match(/eventID:\s*["']([0-9a-f-]{36})["']/);

    expect(beacon?.[1]).toBe(EVENT_ID);
    expect(fbq?.[1]).toBe(EVENT_ID);
  });

  it("manda o mesmo id em toda visita, porque o id é por carregamento", () => {
    // Duas renderizações diferentes recebem ids diferentes do servidor; o que
    // não pode é um id fixo no HTML.
    const outro = page({ eventId: "aaaaaaaa-1111-2222-3333-444444444444" });

    expect(page()).not.toBe(outro);
    expect(outro).toContain("aaaaaaaa-1111-2222-3333-444444444444");
  });

  it("aponta o beacon para a rota do próprio link", () => {
    expect(page()).toMatch(new RegExp(`sendBeacon\\(\\s*["']/go/${LINK_ID}["']`));
  });

  it("marca a âncora para o script achar", () => {
    expect(page()).toContain('id="cta"');
  });

  it("envia a conversão uma vez só por visita", () => {
    expect(page()).toContain("conversionSent");
  });
});

describe("renderRedirectPage: o script inline não pode ser quebrado", () => {
  // Dentro de `<script>` o tokenizador do HTML está em RAWTEXT e não decodifica
  // entidades: escapar com `escapeHtml` produziria uma string de JavaScript
  // válida e errada. O literal vem de JSON.stringify, com o `<` escapado para
  // que nenhuma sequência feche a tag.
  const hostis = [
    "</script><script>alert(1)</script>",
    "';alert(1);//",
    '"-alert(1)-"',
    "</SCRIPT >",
  ];

  for (const hostil of hostis) {
    it(`não deixa o event_id sair do script: ${JSON.stringify(hostil)}`, () => {
      const html = page({ eventId: hostil });

      // Depois do abre do script, nenhum </script> vindo do valor pode existir.
      const depois = html.slice(html.indexOf("<script>") + "<script>".length);
      expect(depois.slice(0, depois.indexOf("</script>"))).not.toContain("</script");
      expect(depois.slice(0, depois.indexOf("</script>"))).not.toContain("<script");
    });
  }

  // O outro lado do mesmo bug: dentro de `<script>` não há decoding de
  // entidade, então `&#39;` chega ao JavaScript como cinco caracteres literais.
  // A string continua válida e o valor fica errado em silêncio — o pior tipo de
  // falha, porque não dá erro em lugar nenhum.
  for (const perigoso of ["a'b", 'a"b', "a&b"]) {
    it(`não vaza entidade no JavaScript: ${JSON.stringify(perigoso)}`, () => {
      const html = page({ eventId: perigoso });
      const script = html.slice(html.indexOf("<script>"), html.indexOf("</script>"));

      expect(script).not.toContain("&#39;");
      expect(script).not.toContain("&quot;");
      expect(script).not.toContain("&amp;");
    });
  }
});

describe("renderRedirectPage: valor", () => {
  it("leva o valor e a moeda para o fbq", () => {
    expect(page({ valueEur: 35 })).toContain("fbq('track','Purchase',{value:35,currency:'EUR'}");
  });

  // Link sem valor é estado válido; mandar `value: null` quebraria o JSON do fbq.
  it("omite o valor quando o link não tem", () => {
    const html = page({ valueEur: null });

    expect(html).toContain("fbq('track','Purchase'");
    expect(html).not.toContain("value:");
  });
});

describe("renderRedirectPage: sem pixel", () => {
  it("não emite script de pixel quando a modelo não tem pixel", () => {
    const html = page({ pixelId: null });

    expect(html).not.toContain("fbevents.js");
    expect(html).not.toContain("sendBeacon");
  });

  it("ignora pixel inválido em vez de despejar no script", () => {
    const html = page({ pixelId: "</script><script>alert(1)</script>" });

    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("fbevents.js");
  });

  it("ainda entrega a página, porque o acesso não depende do pixel", () => {
    const html = page({ pixelId: null });

    expect(html).toContain("Seu acesso está liberado");
    expect(html).toContain('href="https://t.me/+abc"');
  });
});

describe("renderUnavailablePage", () => {
  it("não tem pixel nem beacon", () => {
    const html = renderUnavailablePage();

    expect(html).not.toContain("fbevents.js");
    expect(html).not.toContain("sendBeacon");
    expect(html).toContain('name="robots" content="noindex,nofollow"');
  });

  it("escapa a mensagem recebida", () => {
    const html = renderUnavailablePage("<script>alert(1)</script>");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
