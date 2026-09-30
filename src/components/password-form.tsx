import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Input } from "@/components/input";
import { SettingsField } from "@/components/settings-parts";
import { Spinner } from "@/components/spinner";
import { PASSWORD_MAX, PASSWORD_MIN, changePassword } from "@/lib/account-api";

/**
 * Troca de senha. A senha atual é exigida de propósito: sem ela, quem abrir a
 * aba já logada poderia travar o dono fora da conta.
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setFeedback({ kind: "success", text: "Senha trocada." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível trocar a senha.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Senha atual" htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="••••••••"
          />
        </SettingsField>

        <SettingsField
          label="Nova senha"
          htmlFor="new-password"
          hint={`De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`}
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="••••••••"
          />
        </SettingsField>
      </div>

      <Feedback feedback={feedback} />

      <Button
        type="submit"
        variant="secondary"
        disabled={saving || newPassword === ""}
        className="w-full sm:w-auto sm:min-w-40"
      >
        {saving ? <Spinner /> : <Save />}
        Trocar senha
      </Button>
    </form>
  );
}
