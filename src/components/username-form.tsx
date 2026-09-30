import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Input } from "@/components/input";
import { SettingsField } from "@/components/settings-parts";
import { Spinner } from "@/components/spinner";
import { changeUsername } from "@/lib/account-api";

type UsernameFormProps = {
  /** Usuário salvo no banco, para o campo não começar vazio. */
  username: string;
  /** Avisa o pai para recarregar o que depender da conta. */
  onChanged?: () => void | Promise<void>;
};

const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

/**
 * Troca do usuário. Ele é só o rótulo exibido no menu, por isso passar pela RPC
 * do banco: o e-mail de login não muda e a sessão continua a mesma.
 */
export function UsernameForm({ username, onChanged }: UsernameFormProps) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      const next = new FormData(event.currentTarget).get("username")?.toString() ?? "";
      await changeUsername(next);
      setFeedback({ kind: "success", text: "Usuário atualizado." });
      await onChanged?.();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível trocar o usuário.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SettingsField
        label="Usuário"
        htmlFor="username"
        hint={`De ${USERNAME_MIN} a ${USERNAME_MAX} caracteres: letras, números, ponto, hífen ou sublinhado.`}
      >
        <Input
          id="username"
          name="username"
          key={username}
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          autoComplete="username"
          defaultValue={username}
          placeholder="seu_usuario"
        />
      </SettingsField>

      <Feedback feedback={feedback} />

      <Button
        type="submit"
        variant="secondary"
        disabled={saving}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {saving ? <Spinner /> : <Save />}
        Trocar usuário
      </Button>
    </form>
  );
}
