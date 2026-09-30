/**
 * Rótulo de uma pessoa, em uma ordem só.
 *
 * Havia três ordens diferentes no projeto — `display_name || username || email`,
 * a mesma sem o último, e `username || display_name` com os dois trocados. Com
 * nome de exibição preenchido, o menu do cabeçalho e o formulário de
 * configurações podiam mostrar nomes diferentes para a mesma pessoa.
 */
export type PersonLabel = {
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
};

export function personLabel(person: PersonLabel, fallback = "Sem nome"): string {
  return person.display_name?.trim() || person.username?.trim() || person.email?.trim() || fallback;
}

/** Os três marcadores que dizem em que estado o acesso de uma pessoa está. */
export type AccessState = {
  approved_at?: string | null;
  deactivated_at?: string | null;
  rejected_at?: string | null;
  is_admin?: boolean;
};

/**
 * Estado do acesso, em um predicado só.
 *
 * Havia uma cópia na tela do painel e outra na lista do administrador, e elas
 * discordavam: o painel excluía o admin da fila e a lista não. Um admin com
 * `approved_at` nulo se veria na própria tela de "Aguardando aprovação" e ao
 * mesmo tempo na fila de quem o painel pode aprovar.
 *
 * Regra: quem está dentro é quem tem aprovação, não está desativado nem
 * recusado. Quem está fora, e não é admin, é "aguardando".
 */
export function isWaitingForApproval(person: AccessState): boolean {
  return !person.approved_at && !person.deactivated_at && !person.rejected_at && !person.is_admin;
}
