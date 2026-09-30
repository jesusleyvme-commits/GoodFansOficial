import { Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/card";
import { Spinner } from "@/components/spinner";

type DeleteByNameProps = {
  /** Nome exato que a pessoa precisa digitar para confirmar. */
  name: string;
  /**
   * O que a confirmação está apagando, para o aviso dizer a verdade.
   *
   * Sem isto o texto fixo diz "apaga os links dentro dela", que é verdade para
   * uma modelo e absurdo para uma conta — e a conta apaga muito mais: login,
   * perfil, modelo, links e histórico de conversões.
   */
  warning?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Confirmação digitando o nome, para uma ação sem volta.
 *
 * Usado tanto para modelo quanto para conta. Um clique só não pode destruir
 * nada disso, então a confirmação exige o nome inteiro.
 */
export function DeleteByName({ name, warning, onConfirm, onCancel }: DeleteByNameProps) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O id vinha do nome, o que quebrava de duas formas: nome com espaço gerava
  // `confirm-Ana Souza`, inválido como id para o `htmlFor`, e duas pessoas sem
  // nome caiam no mesmo "Sem nome" e produziam ids repetidos no DOM — com o
  // rótulo apontando para o campo da pessoa errada.
  const fieldId = useId();

  const matches = typed.trim() === name;

  async function confirm() {
    if (!matches || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      // Só aqui o botão volta a ficar clicável. No caminho do sucesso quem
      // desmonta o componente é quem chamou.
      setError(err instanceof Error ? err.message : "Não foi possível apagar.");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-input border border-red-500/25 bg-red-500/[0.06] p-4">
      <p className="text-sm text-red-200">
        {warning ?? (
          <>
            Apagar <strong className="font-medium">{name}</strong> também apaga todos os links
            dentro dela. Não tem como desfazer.
          </>
        )}
      </p>

      <div className="space-y-2">
        <Label htmlFor={fieldId}>
          Digite <span className="font-mono text-red-200">{name}</span> para confirmar
        </Label>
        <Input
          id={fieldId}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={name}
          autoComplete="off"
          spellCheck={false}
          disabled={deleting}
        />
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={!matches || deleting}
          onClick={() => void confirm()}
        >
          {deleting ? <Spinner /> : <Trash2 />}
          Apagar
        </Button>
        <Button variant="ghost" size="sm" disabled={deleting} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
