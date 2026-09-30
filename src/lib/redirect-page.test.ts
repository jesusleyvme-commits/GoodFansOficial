import { describe, expect, it } from "vitest";

import {
  DEFAULT_HEADLINE,
  escapeHtml,
  renderRedirectPage,
  renderUnavailablePage,
} from "@/lib/redirect-page";

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

describe("renderRedirectPage: gate de coleta", () => {
  const gate = {
    collectName: true,
    collectEmail: true,
    collectPhone: true,
  };

  it("sem nenhum campo ligado continua sendo a âncora direta", () => {
    // Estado legado: link criado antes do gate não tem campo nenhum ligado, e
    // precisa continuar indo direto para o destino.
    const html = page();

    expect(html).toContain('href="https://t.me/+abc"');
    expect(html).not.toContain("<form");
  });

  it("com campo ligado mostra o formulário", () => {
    const html = page(gate);

    expect(html).toContain("<form");
    expect(html).toContain('method="post"');
  });

  it("esconde o destino quando o gate está ligado", () => {
    // A razão de o gate existir. Com o destino no HTML, abrir o código-fonte
    // pularia a coleta, que é a única coisa que a tela faz.
    const html = page(gate);

    expect(html).not.toContain("https://t.me/+abc");
  });

  it("só mostra os campos que estão ligados", () => {
    const soEmail = page({ collectEmail: true });

    expect(soEmail).toContain('name="email"');
    expect(soEmail).not.toContain('name="name"');
    expect(soEmail).not.toContain('name="phone"');
  });

  it("todo campo ligado é obrigatório", () => {
    const html = page(gate);
    const campos = html.match(/<input class="input"[^>]*>/g) ?? [];

    expect(campos).toHaveLength(3);
    for (const campo of campos) expect(campo).toContain("required");
  });

  it("pede consentimento com checkbox desmarcado", () => {
    // Pré-marcado não é consentimento: a LGPD exige manifestação livre, e um
    // checkbox que já vem ligado é o oposto disso.
    const html = page(gate);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="consent"');
    expect(html).not.toMatch(/type="checkbox"[^>]*\schecked/);
  });

  it("leva o event_id no campo oculto, para ligar a coleta ao evento", () => {
    expect(page(gate)).toContain(`name="eventId" value="${EVENT_ID}"`);
  });

  it("posta no próprio link, sem rota nova", () => {
    expect(page(gate)).toContain(`action="/go/${LINK_ID}"`);
  });

  it("liga a conversão no submit, e não no click da âncora", () => {
    const html = page(gate);

    expect(html).toContain("c.form.addEventListener('submit',send);");
    expect(html).not.toContain("c.addEventListener('click',send);");
  });

  it("o botão é do tipo submit para o form submits", () => {
    expect(page(gate)).toContain('type="submit"');
  });

  it("usa autocomplete para o teclado do celular abrir certo", () => {
    const html = page(gate);

    expect(html).toContain('autocomplete="name"');
    expect(html).toContain('autocomplete="email"');
    expect(html).toContain('autocomplete="tel"');
  });

  it("coloca a foto da modelo no cabeçalho", () => {
    const url = "https://projeto.supabase.co/storage/v1/object/public/avatars/u1/foto.png";
    expect(page({ ...gate, photoUrl: url })).toContain(`<img class="photo" src="${url}"`);
  });

  it("omite a foto quando a modelo não tem uma", () => {
    expect(page({ ...gate, photoUrl: null })).not.toContain('class="photo"');
    expect(page(gate)).not.toContain('class="photo"');
  });

  // A marca do site saiu da página: quem compra o conteúdo não quer ver o logo
  // de quem intermediou. A foto da modelo ocupa o lugar, e o nome do produto é
  // o título.
  it("não mostra a marca do site e usa o produto como título", () => {
    const html = page(gate);

    expect(html).not.toContain('class="mark"');
    expect(html).toContain('<h1 class="title">Masterclass</h1>');
  });

  it("usa o texto do creator no lugar do padrão", () => {
    const html = page({ ...gate, headline: "Bem-vindo", subhead: "Preencha abaixo" });

    expect(html).toContain("Bem-vindo");
    expect(html).toContain("Preencha abaixo");
    expect(html).not.toContain(DEFAULT_HEADLINE);
  });

  it("volta ao padrão quando o texto do creator é vazio", () => {
    // Null e string vazia significam "usa o padrão", para o creator poder
    // limpar um campo e voltar ao texto do app.
    expect(page({ ...gate, headline: "   " })).toContain("Preencha para liberar o acesso");
  });

  it("mostra o texto de privacidade padrão quando o creator não escreve nada", () => {
    expect(page(gate)).toContain("criptografada");
  });
});

describe("renderRedirectPage: o texto de privacidade", () => {
  const gate = { collectName: true, collectEmail: true, collectPhone: true };

  it("diz a finalidade e o fato concreto de proteção", () => {
    const html = page(gate);

    expect(html).toContain("pessoa real");
    expect(html).toContain("criptografada");
    expect(html).toContain("cifrados no banco");
  });

  // Nenhum destes entra no texto. "100% sigilo" e "garantido pela lei" não são
  // verificáveis — a infraestrutura é de terceiro e uma ordem judicial obriga a
  // entregar — e afirmá-los na tela de um consumidor é publicidade enganosa
  // (CDC art. 37). O teste existe para o texto padrão não voltar aundi.
  /** Só o que o visitante lê. O CSS tem `100%` em `width`, e não é promessa. */
  function textoDaPagina() {
    return page(gate)
      .replace(/<style>[\s\S]*?<\/style>/, "")
      .replace(/<script>[\s\S]*?<\/script>/, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  it("não promete sigilo absoluto nem garantia legal", () => {
    const html = textoDaPagina();

    for (const promessa of [
      "100%",
      "totalmente seguro",
      "garantido pela lei",
      "garantia de privacidade",
      "blindado",
      "inviolável",
    ]) {
      expect(html).not.toContain(promessa);
    }
  });

  it("não promete apagar o que continua guardado", () => {
    // Os dados ficam guardados. Se o texto disser que são apagados, ele está
    // errado — e o erro fica na tela, na frente de quem está decidindo.
    const html = textoDaPagina();

    expect(html).not.toContain("serão apagados");
    expect(html).not.toContain("apagamos seus dados");
    expect(html).not.toContain("descartados");
  });

  it("diz como pedir a exclusão", () => {
    expect(page(gate)).toContain("exclusão");
  });
});

describe("renderRedirectPage: quem manda o texto do gate", () => {
  const gate = { collectName: true, collectEmail: true, collectPhone: true };

  // Headline, subhead e nota de privacidade saem de digitação do creator e
  // entram direto no corpo do documento.
  it("escapa HTML no headline", () => {
    const html = page({ ...gate, headline: "<script>alert('x')</script>" });

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa aspas no headline, para não fechar atributo", () => {
    const html = page({ ...gate, headline: '" onmouseover="alert(1)' });

    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain("&quot;");
  });

  it("escapa HTML na nota de privacidade", () => {
    const html = page({ ...gate, privacyNote: "<img src=x onerror=alert(1)>" });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

describe("renderRedirectPage: preview", () => {
  const gate = { collectName: true, collectEmail: true, collectPhone: true };

  it("avisa que é preview, para ninguém confundir com o link real", () => {
    expect(page({ ...gate, preview: true })).toContain("Pré-visualização");
  });

  it("bloqueia o envio no navegador", () => {
    // Sem isto o creator clica no botão achando que é rascunho e suja a lista
    // dele com coleta de teste.
    expect(page({ ...gate, preview: true })).toContain("e.preventDefault()");
  });

  it("leva ao link real, para o creator sair do iframe e conferir de fora", () => {
    // O submit é bloqueado no preview, então sem esta âncora o creator não tem
    // como ver a página como o visitante a vê.
    expect(page({ ...gate, preview: true })).toContain(`href="/go/${LINK_ID}"`);
  });

  it("não manda o pixel, para o preview não virar conversão no relatório", () => {
    const html = page({ ...gate, preview: true, pixelId: "1593499121650270" });

    expect(html).not.toContain("fbevents.js");
    expect(html).not.toContain("sendBeacon");
  });

  it("tem o mesmo formulário da versão real", () => {
    // Se o preview e a página real divergissem, o preview não serviria para
    // nada. O unico extra é a tarja e o bloqueio de envio.
    const real = page(gate);
    const preview = page({ ...gate, preview: true });

    for (const campo of ['name="name"', 'name="email"', 'name="phone"', 'name="consent"']) {
      expect(preview).toContain(campo);
      expect(real).toContain(campo);
    }
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
