import { describe, expect, it } from "vitest";

import { buildCapiEvent } from "@/lib/meta-event";

const ID = "463ee298-48dc-4005-818e-314e34030e14";
const IP = "198.51.100.7";
const UA = "Mozilla/5.0";

describe("buildCapiEvent: obrigatórios da Meta", () => {
  // Este é o teste que teria pego o bug do `action_source`. A Meta responde
  // "Invalid parameter" (código 100) quando ele falta, com o mesmo texto que usa
  // para token sem acesso ao conjunto de dados.
  it("sempre envia action_source", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
    });

    expect(event.action_source).toBe("system_generated");
  });

  it("sempre envia user_data, mesmo sem contexto de visitante", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
    });

    // A chave precisa existir. `user_data` ausente também é recusado pela Meta.
    expect(event).toHaveProperty("user_data");
    expect(event.user_data).toEqual({});
  });

  it("envia event_time em segundos, com 10 dígitos", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      eventTime: 1_759_000_000,
    });

    expect(event.event_time).toBe(1_759_000_000);
    // Milissegundos é o erro clássico: 13 dígitos e a Meta descarta o evento.
    expect(String(event.event_time)).toMatch(/^\d{10}$/);
  });

  it("usa o instante atual quando eventTime não vem", () => {
    const antes = Math.floor(Date.now() / 1000);
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
    });

    expect(event.event_time).toBeGreaterThanOrEqual(antes);
  });

  it("preserva o event_id, que é a chave da deduplicação", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
    });

    expect(event.event_id).toBe(ID);
  });
});

describe("buildCapiEvent: user_data", () => {
  it("manda IP e user agent em claro, sem hash", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
      userData: { client_ip_address: IP, client_user_agent: UA },
    });

    expect(event.user_data).toEqual({ client_ip_address: IP, client_user_agent: UA });
  });

  // Campo vazio e campo ausente não são a mesma coisa para a Meta: string vazia
  // faz ela recusar o evento inteiro.
  it("omite o campo em vez de mandar string vazia", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
      userData: { client_ip_address: "", client_user_agent: "   " },
    });

    expect(event.user_data).toEqual({});
    expect(Object.keys(event.user_data)).toHaveLength(0);
  });

  it("omite campo undefined e null", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
      userData: { client_ip_address: null, client_user_agent: undefined },
    });

    expect(event.user_data).toEqual({});
  });

  it("guarda só o que veio preenchido", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
      userData: { client_ip_address: IP, client_user_agent: null },
    });

    expect(event.user_data).toEqual({ client_ip_address: IP });
  });
});

describe("buildCapiEvent: website", () => {
  it("carrega a URL da página quando a conversão vem de uma página", () => {
    const url = "https://goodfans.vercel.app/go/75534c00-a4b8-42e6-970e-2a0933d1194b";
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: url,
    });

    expect(event.event_source_url).toBe(url);
  });

  it("não manda event_source_url em branco", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      eventSourceUrl: "   ",
    });

    expect(event).not.toHaveProperty("event_source_url");
  });
});

describe("buildCapiEvent: valor da conversão", () => {
  it("leva valor e moeda juntos", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      value: 35,
      currency: "EUR",
    });

    expect(event.custom_data).toEqual({ value: 35, currency: "EUR" });
  });

  it("assume EUR quando a moeda não vem", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      value: 19.9,
    });

    expect(event.custom_data).toEqual({ value: 19.9, currency: "EUR" });
  });

  // A Meta recusa Purchase sem valor, então o evento precisa ser enviado sem
  // custom_data e não com um valor inventado.
  it("omite custom_data sem valor, em vez de mandar zero", () => {
    for (const value of [undefined, null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const event = buildCapiEvent({
        eventName: "Purchase",
        eventId: ID,
        actionSource: "system_generated",
        value,
      });

      expect(event).not.toHaveProperty("custom_data");
    }
  });
});

describe("buildCapiEvent: código de teste", () => {
  it("carrega o código quando informado", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      testEventCode: "TEST12345678",
    });

    expect(event.test_event_code).toBe("TEST12345678");
  });

  // Sem o código, a Meta conta a conversão como venda real. O botão de teste
  // recusa o envio, e aqui a chave simplesmente não aparece.
  it("omite a chave quando não há código", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
    });

    expect(event).not.toHaveProperty("test_event_code");
  });
});

describe("buildCapiEvent: forma final enviada", () => {
  it("é serializável sem undefined, que o JSON.stringify eliminaria", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "website",
      eventSourceUrl: "https://exemplo.test/go/x",
      userData: { client_ip_address: IP, client_user_agent: UA },
      value: 35,
      currency: "EUR",
    });

    const json = JSON.stringify({ data: [event] });

    expect(json).not.toContain("undefined");
    expect(JSON.parse(json).data[0]).toEqual(event);
  });

  it("o caminho do botão de teste monta um Purchase completo", () => {
    const event = buildCapiEvent({
      eventName: "Purchase",
      eventId: ID,
      actionSource: "system_generated",
      userData: { client_ip_address: IP, client_user_agent: UA },
      testEventCode: "TEST12345678",
      value: 35,
      currency: "EUR",
    });

    expect(Object.keys(event).sort()).toEqual([
      "action_source",
      "custom_data",
      "event_id",
      "event_name",
      "event_time",
      "test_event_code",
      "user_data",
    ]);
  });
});
