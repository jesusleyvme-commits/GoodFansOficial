import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";

/**
 * E-mail, usuário de exibição e senha. O login é por e-mail real, então o
 * "usuário" é só o rótulo que aparece no menu e vem de `profiles.username`.
 * A senha é do próprio GoTrue, com a senha atual como prova de que é você.
 */

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function changeEmail(newEmail: string): Promise<void> {
  const address = newEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(address)) throw new Error("Digite um e-mail válido.");

  const { data: sessionData } = await supabase().auth.getSession();
  const current = sessionData.session?.user.email?.toLowerCase();
  if (!current) throw new Error("Sessão expirada. Entre de novo.");
  if (address === current) throw new Error("Esse já é o seu e-mail de login.");

  // Trocar o e-mail manda uma confirmação para o endereço novo: só entra em
  // vigor depois do clique, e a sessão continua válida no antigo.
  const { error } = await supabase().auth.updateUser({ email: address });
  if (error) throw new Error(readError(error));
}

export async function changeUsername(username: string): Promise<void> {
  // O usuário é só o nome de exibição; a mesma regra do front evita duas
  // grafias diferentes do mesmo nome convivendo no banco.
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(normalized)) {
    throw new Error("Usuário inválido: use de 3 a 32 letras, números, ponto, hífen ou sublinhado.");
  }

  const { data, error } = await supabase().rpc("set_account_username", {
    p_username: normalized,
  });

  if (error) throw new Error(readError(error));
  if (!data) throw new Error("Não foi possível trocar o usuário.");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < PASSWORD_MIN) {
    throw new Error(`A nova senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`);
  }
  // 72 bytes é o limite do bcrypt; acima disso ele trunca e a parte final vira
  // decorativo, o que é pior do que recusar.
  if (newPassword.length > PASSWORD_MAX) {
    throw new Error(`A nova senha pode ter no máximo ${PASSWORD_MAX} caracteres.`);
  }
  if (newPassword === currentPassword) {
    throw new Error("A nova senha é igual à atual.");
  }

  const { data: sessionData } = await supabase().auth.getSession();
  const email = sessionData.session?.user.email;
  if (!email) throw new Error("Sessão expirada. Entre de novo.");

  // Reautenticar com a senha atual: sem isso, quem abrir a aba já logada poderia
  // travar o dono fora da conta.
  const { error: signInError } = await supabase().auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new Error("A senha atual está errada.");

  const { error } = await supabase().auth.updateUser({ password: newPassword });
  if (error) throw new Error(readError(error));
}

/** Nome de exibição guardado no perfil, que é o que o menu mostra. */
export async function getCurrentUsername(): Promise<string> {
  const { data } = await supabase().from("profiles").select("username, display_name").maybeSingle();

  return data?.username?.trim() || data?.display_name?.trim() || "";
}
