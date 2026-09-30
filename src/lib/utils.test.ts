import { describe, expect, it } from "vitest";

import { isPermissionDenied } from "@/lib/utils";

// O PostgREST representa a mesma negação de três jeitos, dependendo de onde a
// recusa acontece. Se só um deles for reconhecido, alguém que não é admin lê
// "Não foi possível carregar" e perde tempo caçando um problema que não existe.
describe("isPermissionDenied", () => {
  it("pega o código de permissão insuficiente do Postgres", () => {
    expect(isPermissionDenied({ code: "42501" })).toBe(true);
    expect(isPermissionDenied({ code: "42512" })).toBe(true);
  });

  it("pega o status HTTP", () => {
    expect(isPermissionDenied({ code: "401" })).toBe(true);
    expect(isPermissionDenied({ code: "403" })).toBe(true);
  });

  it("pega o erro do PostgREST pelo texto", () => {
    expect(isPermissionDenied({ code: "PGRST", message: "permission denied" })).toBe(true);
  });

  it("pega a mensagem que o próprio banco devolve em português", () => {
    expect(
      isPermissionDenied({ message: "Só o administrador pode ver a lista de usuários." }),
    ).toBe(true);
  });

  it("pega o erro embrulhado em Error, com o código perdido", () => {
    // O supabase-js às vezes embrulha a mensagem num Error sem preservar o
    // código, e é o caso mais comum na prática.
    expect(isPermissionDenied(new Error("permission denied for function list_people"))).toBe(true);
  });

  it("não confunde com falha comum", () => {
    expect(isPermissionDenied(new Error("Failed to fetch"))).toBe(false);
    expect(isPermissionDenied({ code: "23505" })).toBe(false);
    expect(isPermissionDenied(null)).toBe(false);
    expect(isPermissionDenied(undefined)).toBe(false);
    expect(isPermissionDenied("texto")).toBe(false);
    expect(isPermissionDenied({})).toBe(false);
  });
});
