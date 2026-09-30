import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AvatarField } from "@/components/avatar-field";
import { Button } from "@/components/button";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Input } from "@/components/input";
import { SettingsField } from "@/components/settings-parts";
import { Spinner } from "@/components/spinner";
import { saveProfileIdentity } from "@/lib/profile-api";

type ProfileFormProps = {
  /** Valor salvo no banco; o formulário é controlado a partir daqui. */
  displayName: string;
  avatarPath: string | null;
  onSaved: () => void | Promise<void>;
};

const DISPLAY_NAME_MAX = 80;

/**
 * Nome visível e foto. O nome é o que rankings e telas públicas mostram, então
 * fica separado do usuário, que é o identificador da conta.
 */
export function ProfileForm({ displayName, avatarPath, onSaved }: ProfileFormProps) {
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  // Depois de salvar, o pai devolve o perfil novo e o formulário precisa largar
  // o rascunho, senão ele continua exibindo o texto anterior.
  useEffect(() => {
    setName(displayName);
    setAvatar(null);
  }, [displayName, avatarPath]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      await saveProfileIdentity({ displayName: name, avatar });
      setFeedback({ kind: "success", text: "Perfil atualizado." });
      await onSaved();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar o perfil.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AvatarField
        avatarPath={avatarPath}
        fallbackInitial={name.trim().charAt(0).toUpperCase()}
        file={avatar}
        onPick={setAvatar}
      />

      <SettingsField
        label="Nome visível"
        htmlFor="display-name"
        hint="É este nome que aparece nos rankings e nas telas públicas. Vazio mostra o seu usuário."
      >
        <Input
          id="display-name"
          maxLength={DISPLAY_NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jesus"
        />
      </SettingsField>

      <Feedback feedback={feedback} />

      <Button type="submit" disabled={saving} className="w-full sm:w-auto sm:min-w-40">
        {saving ? <Spinner /> : <Save />}
        Salvar perfil
      </Button>
    </form>
  );
}
