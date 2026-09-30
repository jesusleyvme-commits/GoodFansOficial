import { describe, expect, it } from "vitest";

import { publicAvatarUrl } from "@/lib/avatar-path";

const BASE = "https://projeto.supabase.co";

describe("publicAvatarUrl", () => {
  it("monta a URL do bucket público", () => {
    expect(publicAvatarUrl(BASE, "u1/foto.jpg")).toBe(
      `${BASE}/storage/v1/object/public/avatars/u1/foto.jpg`,
    );
  });

  it("aceita a base com barra final", () => {
    expect(publicAvatarUrl(`${BASE}/`, "u1/foto.jpg")).toBe(
      `${BASE}/storage/v1/object/public/avatars/u1/foto.jpg`,
    );
  });

  it("devolve null sem caminho", () => {
    expect(publicAvatarUrl(BASE, null)).toBeNull();
    expect(publicAvatarUrl(BASE, undefined)).toBeNull();
    expect(publicAvatarUrl(BASE, "   ")).toBeNull();
  });

  // A foto vem de `models.avatar_path`, que só o creator escreve. Ainda assim,
  // o caminho entra no `src` de uma página pública, e um `src` apontando para
  // outro host é beacon de rastreamento disfarçado de imagem. Chegar aqui já
  // significa que alguém furou a escrita, então o renderizador recusa mesmo assim.
  it("recusa caminho que sai do bucket", () => {
    expect(publicAvatarUrl(BASE, "https://exemplo.com/rastro.gif")).toBeNull();
    expect(publicAvatarUrl(BASE, "//exemplo.com/rastro.gif")).toBeNull();
    expect(publicAvatarUrl(BASE, "/u1/foto.jpg")).toBeNull();
    expect(publicAvatarUrl(BASE, "../../u1/foto.jpg")).toBeNull();
    expect(publicAvatarUrl(BASE, "data:image/gif;base64,AAAA")).toBeNull();
  });
});
