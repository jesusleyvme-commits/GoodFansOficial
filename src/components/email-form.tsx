import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Input } from "@/components/input";
import { SettingsField } from "@/components/settings-parts";
import { Spinner } from "@/components/spinner";
import { changeEmail } from "@/lib/account-api";

type EmailFormProps = {
  /** E-mail de login atual, para o campo não começar vazio. */
  email: string;
  /** Avisa o pai para recarregar o que depender da conta. */
  onChanged?: () => void | Promise<void>;
};

const EMAIL_MAX = 254;

/**
 * Troca do e-mail de login. O GoTrue só promove o endereço novo depois da
 * confirmação, então a sessão continua valendo no endereço antigo até lá.
 */
export function EmailForm({ email, onChanged }: EmailFormProps) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      // uncontrolled: o pai guarda o valor salvo e re-renderiza por key.
      const next = new FormData(event.currentTarget).get("email")?.toString() ?? "";
      await changeEmail(next);
      setFeedback({
        kind: "success",
        text: "Confirme o e-mail novo na caixa dele para ele virar o seu login.",
      });
      await onChanged?.();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível trocar o e-mail.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SettingsField
        label="E-mail de login"
        htmlFor="email"
        hint="É com este endereço que você entra. Ao trocar, confirmamos o novo antes de valer."
      >
        <Input
          id="email"
          name="email"
          type="email"
          key={email}
          required
          maxLength={EMAIL_MAX}
          autoComplete="email"
          defaultValue={email}
          placeholder="voce@exemplo.com"
        />
      </SettingsField>

      <Feedback feedback={feedback} />

      <Button
        type="submit"
        variant="secondary"
        disabled={saving}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {saving ? <Spinner /> : <Mail />}
        Trocar e-mail
      </Button>
    </form>
  );
}
