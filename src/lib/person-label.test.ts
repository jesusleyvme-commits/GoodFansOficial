import { describe, expect, it } from "vitest";

import { isWaitingForApproval, personLabel } from "@/lib/person-label";
import { errorText } from "@/lib/utils";

describe("personLabel", () => {
  // Havia três ordens diferentes no projeto, uma delas com os dois campos
  // trocados, então o menu e o formulário de configurações podiam mostrar
  // nomes diferentes para a mesma pessoa.
  it("prefere o nome de exibição", () => {
    expect(
      personLabel({ display_name: "Ana Souza", username: "ana", email: "ana@exemplo.test" }),
    ).toBe("Ana Souza");
  });

  it("cai para o usuário, depois para o e-mail", () => {
    expect(personLabel({ username: "ana", email: "ana@exemplo.test" })).toBe("ana");
    expect(personLabel({ email: "ana@exemplo.test" })).toBe("ana@exemplo.test");
  });

  it("ignora campo vazio ou só com espaço", () => {
    expect(personLabel({ display_name: "   ", username: "ana" })).toBe("ana");
    expect(personLabel({ display_name: "", username: "" })).toBe("Sem nome");
  });

  it("usa o texto padrão quando não há nada", () => {
    expect(personLabel({})).toBe("Sem nome");
    expect(personLabel({}, "Conta")).toBe("Conta");
  });
});

describe("isWaitingForApproval", () => {
  // A versão do painel desativado não olhava `is_admin`, então um admin sem
  // aprovação aparecia na própria tela de "Aguardando" e na fila de aprováveis.
  it("aguarda quem nunca foi aprovado", () => {
    expect(isWaitingForApproval({})).toBe(true);
  });

  it("não faz esperar quem já foi aprovado", () => {
    expect(isWaitingForApproval({ approved_at: "2026-09-29T10:00:00Z" })).toBe(false);
  });

  it("não faz esperar quem foi desativado, porque já entrou uma vez", () => {
    expect(
      isWaitingForApproval({
        approved_at: "2026-09-29T10:00:00Z",
        deactivated_at: "2026-09-29T11:00:00Z",
      }),
    ).toBe(false);
  });

  it("não faz esperar quem foi recusado", () => {
    expect(isWaitingForApproval({ rejected_at: "2026-09-29T10:00:00Z" })).toBe(false);
  });

  it("não faz esperar o administrador, que não passa por aprovação", () => {
    expect(isWaitingForApproval({ is_admin: true })).toBe(false);
  });
});

describe("errorText", () => {
  // O padrão repetido umas vinte vezes deixava passar casos como um erro que é
  // um objeto solto, que viraria "[object Object]" na tela.
  it("usa a mensagem de um Error", () => {
    expect(errorText(new Error("token inválido"), "fallback")).toBe("token inválido");
  });

  it("usa a string quando o erro já é texto", () => {
    expect(errorText("timeout", "fallback")).toBe("timeout");
  });

  it("cai no texto padrão para o resto", () => {
    expect(errorText(null, "fallback")).toBe("fallback");
    expect(errorText(undefined, "fallback")).toBe("fallback");
    expect(errorText(new Error(""), "fallback")).toBe("fallback");
    expect(errorText(42, "fallback")).toBe("fallback");
    expect(errorText({ message: "quase" }, "fallback")).toBe("fallback");
  });

  it("nunca devolve algo que vire [object Object]", () => {
    const texto = errorText({ qualquer: "coisa" }, "fallback");
    expect(texto).toBe("fallback");
  });
});
