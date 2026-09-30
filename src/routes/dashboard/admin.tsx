import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Trash2, Undo2, UserCheck, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { DeleteByName } from "@/components/delete-by-name";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Spinner } from "@/components/spinner";
import {
  deletePerson,
  listPeople,
  setPersonActivation,
  setPersonApproval,
  setPersonRejection,
  type Person,
} from "@/lib/admin-api";
import { useAuthSnapshot } from "@/lib/use-auth";
import { personLabel as personLabelOf, isWaitingForApproval } from "@/lib/person-label";
import { pageHead } from "@/lib/site-head";
import { errorText, isPermissionDenied } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/admin")({
  ssr: false,
  component: AdminPage,
  // Sem guarda em `beforeLoad`, de propósito.
  //
  // Havia uma aqui chamando `is_admin()`, e ela quebrava a página inteira: o
  // painel é `ssr: false` e a sessão vive no localStorage, restaurada pelo
  // layout depois. O `beforeLoad` roda antes disso, então a chamada saía sem
  // sessão, como `anon` — e como o acesso de `anon` a `is_admin()` foi revogado
  // de propósito, voltava permission denied e a tela não renderizava.
  //
  // A guarda de verdade é o banco: `list_people()` recusa quem não é
  // administrador. Aqui basta traduzir essa recusa em vez de mostrar uma tela
  // vazia que mente dizendo que não há ninguém cadastrado.
  head: () => pageHead({ title: "Usuários", path: "/dashboard/admin" }),
});

function AdminPage() {
  const { session } = useAuthSnapshot();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setFeedback(null);
    try {
      setPeople(await listPeople());
    } catch (error) {
      // `null` e não `[]`: lista vazia é "não tem ninguém", e dizer isso
      // quando na verdade a chamada falhou é uma mentira que esconde o
      // problema até alguém achar que a conta sumiu.
      setPeople(null);

      // A recusa do banco é a informação útil. Sem este tratamento, quem não é
      // administrador lia "Não foi possível carregar a lista de usuários" e
      // achava que era a internet.
      setLoadError(
        isPermissionDenied(error)
          ? "Esta área é só para o administrador da conta."
          : errorText(error, "Não foi possível carregar a lista de usuários."),
      );
    }
  }, []);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  /**
   * Aplica a mudança e recarrega a lista do banco.
   *
   * Recarrega em vez de remendar a linha local porque o estado é uma máquina de
   * três colunas, e cada transição mexe em mais de uma: `set_person_rejection`
   * limpa `approved_at` junto com a recusa. Se o painel aplicasse só a coluna
   * que ele mandou, o caso Aprovar â†’ Recusar â†’ Desfazer recusa devolveria a
   * pessoa para "Aprovada" na tela â€” e no banco ela estaria sem aprovação, sem
   * acesso e fora da fila. O que se exibe tem de ser o que o banco respondeu.
   */
  const run = useCallback(
    async (person: Person, action: () => Promise<boolean>, successText: string) => {
      setBusyId(person.id);
      setFeedback(null);

      try {
        await action();
        await refresh();
        setFeedback({ kind: "success", text: successText });
      } catch (error) {
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Não foi possível alterar o acesso.",
        });
        await refresh();
      } finally {
        // Só limpa se ainda for desta linha: duas linhas podem estar em voo ao
        // mesmo tempo, e limpar incondicionalmente desligaria o botão da outra.
        setBusyId((current) => (current === person.id ? null : current));
      }
    },
    [refresh],
  );

  /**
   * Apagar a conta inteira é sem volta: some o login, a modelo, os links e o
   * histórico de conversões. A linha sai da lista antes da resposta pelo mesmo
   * motivo do `run`, e se a chamada falhar a lista recarrega do banco.
   */
  const onDelete = useCallback(
    async (person: Person) => {
      setBusyId(person.id);
      setFeedback(null);

      try {
        await deletePerson(person.id);
        setPeople((current) => current?.filter((item) => item.id !== person.id) ?? null);
        setFeedback({
          kind: "success",
          text: `${personLabelOf(person)} foi apagada, com tudo que tinha.`,
        });
      } catch (error) {
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Não foi possível apagar a conta.",
        });
        await refresh();
      } finally {
        setBusyId(null);
        // Só fecha a confirmação se ainda for desta linha: abrir a de outra
        // pessoa enquanto esta estava em voo fecharia a confirmação sozinha e
        // jogaria fora o que o administrador já tinha digitado.
        setDeletingId((current) => (current === person.id ? null : current));
      }
    },
    [refresh],
  );

  // Inativo não entra na contagem de quem espera: essa pessoa já foi aprovada e
  // a decisão sobre ela já é desativar ou apagar.
  const waiting = people?.filter(isWaitingForApproval) ?? [];

  return (
    <div className="space-y-6">
      {/* As seções do painel ficam no menu do perfil, então quem chega aqui por
          um link precisa de um caminho de volta explícito. */}
      <Button variant="secondary" size="sm" asChild className="-ml-2">
        <Link to="/dashboard">
          <ArrowLeft />
          Voltar para modelos
        </Link>
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="size-6 text-brand-400" />
          Usuários
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quem se cadastra entra na fila e só cria modelo e link depois de ser aprovado. Cada
          usuário tem os seus: os pixels e tokens nunca se misturam.
        </p>
      </div>

      {feedback && <Feedback feedback={feedback} />}
      {/* `feedback` e `loadError` nunca aparecem juntos: um erro de carregamento
          já desliga o `feedback`, senão a tela mostrava duas caixas vermelhas
          empilhadas dizendo a mesma coisa. */}

      {waiting.length > 0 && (
        <p className="text-sm text-amber-300">
          {waiting.length === 1 ? "1 pessoa aguardando" : `${waiting.length} pessoas aguardando`}{" "}
          aprovação.
        </p>
      )}

      {/* `people === null` cobre carregando e falhou, e os dois precisam ficar
          distintos na tela: sem esta separação, uma falha de rede deixava o
          spinner girando para sempre em cima de um erro que já apareceu. */}
      {people === null ? (
        loadError ? null : (
          <div className="grid place-items-center py-16">
            <Spinner className="size-5 text-brand-400" />
          </div>
        )
      ) : people.length === 0 ? (
        <div className="grid place-items-center rounded-input border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {people.map((person) => {
            const rejected = person.rejected_at !== null;
            const inactive = person.deactivated_at !== null;
            const approved = person.approved_at !== null && !rejected && !inactive;
            const busy = busyId === person.id;
            const deleting = deletingId === person.id;
            const isSelf = person.id === session?.user.id;
            const label = personLabelOf(person);

            return (
              <li
                key={person.id}
                className={`rounded-input border p-4 ${
                  rejected
                    ? "border-red-500/20 bg-red-500/[0.04]"
                    : inactive
                      ? "border-white/[0.06] bg-white/[0.02] opacity-70"
                      : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{label}</span>
                      {person.is_admin && (
                        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-300">
                          admin
                        </span>
                      )}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground/80">
                      {person.email ?? person.username ?? "sem identificação"} ·{" "}
                      {plural(person.model_count, "modelo", "modelos")} ·{" "}
                      {plural(person.link_count, "link", "links")} · entrou{" "}
                      {new Date(person.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      rejected
                        ? "bg-red-500/15 text-red-300"
                        : inactive
                          ? "bg-white/[0.08] text-muted-foreground"
                          : approved
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {rejected
                      ? "Recusada"
                      : inactive
                        ? "Inativa"
                        : approved
                          ? "Aprovada"
                          : "Aguardando"}
                  </span>
                </div>

                {!isSelf && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    {deleting ? (
                      <DeleteByName
                        name={label}
                        // O texto padrão fala em "links dentro dela", que não é
                        // o que acontece com uma conta: apaga o login também, e
                        // sem o login a pessoa nem consegue mais entrar para
                        // recuperar o que tinha.
                        warning={
                          <>
                            Apagar <strong className="font-medium">{label}</strong> apaga o login, a
                            modelo, os links e o histórico de conversões. Não tem como desfazer, e o
                            e-mail volta a ficar disponível para outro cadastro.
                          </>
                        }
                        onCancel={() => setDeletingId(null)}
                        onConfirm={() => onDelete(person)}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {/* Cada estado oferece só o próximo passo. Quem já está
                            aprovado não precisa ver "aprovar" nem "recusar" de
                            novo: a decisão já foi tomada. */}
                        {rejected ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                person,
                                () => setPersonRejection(person.id, false),
                                `A recusa de ${label} foi desfeita.`,
                              )
                            }
                          >
                            <Undo2 />
                            Desfazer recusa
                          </Button>
                        ) : inactive ? (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  person,
                                  () => setPersonActivation(person.id, true),
                                  `${label} foi reativada.`,
                                )
                              }
                            >
                              <UserCheck />
                              Reativar
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => setDeletingId(person.id)}
                            >
                              <Trash2 />
                              Apagar
                            </Button>
                          </>
                        ) : approved ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                person,
                                () => setPersonActivation(person.id, false),
                                `${label} foi desativada. O acesso para, mas a conta fica aqui.`,
                              )
                            }
                          >
                            <UserX />
                            Desativar
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  person,
                                  () => setPersonApproval(person.id, true),
                                  `${label} foi aprovada.`,
                                )
                              }
                            >
                              <UserCheck />
                              Aprovar
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  person,
                                  () => setPersonRejection(person.id, true),
                                  `${label} foi recusada. Ela não entra mais, e dá para desfazer.`,
                                )
                              }
                            >
                              <UserX />
                              Recusar
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isSelf && (
                  <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-muted-foreground/80">
                    Esta é a sua conta. O administrador não altera o próprio acesso, para o painel
                    não ficar sem dono.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
