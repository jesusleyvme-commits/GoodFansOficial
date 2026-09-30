import { Plus, Upload, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import { MetaTokenField } from "@/components/meta-token-field";
import { Spinner } from "@/components/spinner";
import { avatarUrl } from "@/lib/avatars";
import type { Model } from "@/lib/database.types";
import { saveModelMetaToken } from "@/lib/meta-token";
import { createModel, updateModel } from "@/lib/models-api";

type ModelFormProps = {
  /** Ausente = criar. Presente = editar aquela modelo. */
  model?: Model;
  onSaved: (model: Model) => void | Promise<void>;
};
export function ModelForm({ model, onSaved }: ModelFormProps) {
  const [name, setName] = useState(model?.name ?? "");
  const [pixelId, setPixelId] = useState(model?.meta_pixel_id ?? "");
  const [metaToken, setMetaToken] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  function onPickAvatar(file: File | null) {
    setAvatar(file);
    // Libera o object URL anterior para não vazar memória a cada escolha.
    setAvatarPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      // Voltar para "nada escolhido" mostra de novo a foto que está no banco,
      // não um buraco: o arquivo anterior continua salvo lá.
      return file
        ? URL.createObjectURL(file)
        : model?.avatar_path
          ? avatarUrl(model.avatar_path)
          : null;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFeedback(null);

    // O destino não é perguntado aqui: cada link da modelo carrega o seu.
    const input = { name, pixelId, avatar };

    try {
      const saved = model ? await updateModel(model.id, input) : await createModel(input);

      // Numa modelo nova o token só pode ser gravado depois que a linha ganha id.
      if (metaToken.trim() !== "") {
        try {
          await saveModelMetaToken(saved.id, metaToken);
        } catch (error) {
          setFeedback({
            kind: "error",
            text: `${saved.name} foi salva, mas o token não: ${
              error instanceof Error ? error.message : "erro desconhecido"
            }`,
          });
          await onSaved(saved);
          return;
        }
      }

      if (!model) {
        setName("");
        setPixelId("");
        onPickAvatar(null);
      }
      setMetaToken("");

      setFeedback({ kind: "success", text: `${saved.name} salva.` });
      await onSaved(saved);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar a modelo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="model-name">Nome</Label>
        <Input
          id="model-name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ana Souza"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model-pixel">ID do Pixel</Label>
        <Input
          id="model-pixel"
          inputMode="numeric"
          autoComplete="off"
          value={pixelId}
          onChange={(event) => setPixelId(event.target.value)}
          placeholder="Deixe vazio para não usar pixel"
        />
        <p className="text-xs text-muted-foreground">
          Vazio deixa a modelo sem token próprio.
        </p>{" "}
      </div>

      <MetaTokenField
        id="model-token"
        hasToken={model?.has_meta_token ?? false}
        modelId={model?.id ?? null}
        onSave={async (token) => {
          // Numa modelo nova ainda não existe linha para gravar, então o token
          // fica guardado aqui e sobe junto com o cadastro.
          if (!model) {
            setMetaToken(token);
            setFeedback(
              token
                ? { kind: "success", text: "O token entra assim que a modelo for cadastrada." }
                : null,
            );
            return true;
          }
          return saveModelMetaToken(model.id, token);
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="model-avatar">Foto</Label>
        <div className="flex items-center gap-3">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Pré-visualização"
              className="size-12 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : null}

          <div className="flex flex-1 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => document.getElementById("model-avatar")?.click()}
            >
              <Upload />
              Escolher
            </Button>

            {avatar && (
              <Button variant="ghost" size="sm" type="button" onClick={() => onPickAvatar(null)}>
                <X />
                Remover
              </Button>
            )}
          </div>
        </div>

        <input
          id="model-avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => onPickAvatar(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP ou GIF de até 2 MB.</p>
      </div>

      <Feedback feedback={feedback} />

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <Spinner /> : <Plus />}
        {model ? "Salvar alterações" : "Cadastrar modelo"}
      </Button>
    </form>
  );
}
