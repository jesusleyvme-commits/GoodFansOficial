import { readError } from "@/lib/links-api";
import { supabase } from "@/lib/supabase";

/**
 * Painel do administrador: quem entrou, quem está esperando e quantos modelos e
 * links cada pessoa tem.
 *
 * Nada aqui atravessa a RLS do lado do cliente — a lista vem de `list_people`,
 * que é SECURITY DEFINER e recusa quem não é administrador. Dupla checagem: a
 * interface esconde o painel, o banco recusa a chamada.
 *
 * A lista de propósito não traz pixel nem token. Cada modelo é de quem o criou
 * e o token nunca sai do banco; misturar isso aqui seria desfazer o isolamento
 * que o resto do app mantém.
 */
export type Person = {
  id: string;
  username: string | null;
  display_name: string | null;
  /** Vem de `auth.users`, que só o dono do schema lê. É o que permite saber de quem é a conta. */
  email: string | null;
  created_at: string;
  approved_at: string | null;
  /** Aprovada um dia e desligada depois. O `approved_at` continua lá como histórico. */
  deactivated_at: string | null;
  rejected_at: string | null;
  is_admin: boolean;
  model_count: number;
  link_count: number;
};

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase().rpc("is_admin");

  if (error) throw new Error(readError(error));
  return data === true;
}

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase().rpc("list_people");

  if (error) throw new Error(readError(error));
  return data ?? [];
}

// Aprovar, revogar, recusar e desfazer a recusa não usam `readError`: as
// mensagens das funções já são texto de tela, e o 42501 genérico apagaria a
// diferença entre "não é admin", "não pode mexer em si mesmo" e "está recusada".
export async function setPersonApproval(userId: string, approved: boolean): Promise<boolean> {
  const { data, error } = await supabase().rpc("set_person_approval", {
    p_user_id: userId,
    p_approved: approved,
  });

  if (error) throw new Error(error.message);
  return data === true;
}

export async function setPersonRejection(userId: string, rejected: boolean): Promise<boolean> {
  const { data, error } = await supabase().rpc("set_person_rejection", {
    p_user_id: userId,
    p_rejected: rejected,
  });

  if (error) throw new Error(error.message);
  return data === true;
}

export async function setPersonActivation(userId: string, active: boolean): Promise<boolean> {
  const { data, error } = await supabase().rpc("set_person_activation", {
    p_user_id: userId,
    p_active: active,
  });

  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * Apaga a conta inteira: login, perfil, modelo, links e histórico de conversões.
 *
 * Sem volta, e a interface pede confirmação digitando o nome. A cascata é do
 * banco: `auth.users` cascateia para `profiles`, `models` e `delivery_links`.
 */
export async function deletePerson(userId: string): Promise<boolean> {
  const { data, error } = await supabase().rpc("delete_person", { p_user_id: userId });

  if (error) throw new Error(error.message);
  return data === true;
}
