import { Check, Copy, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { Label } from "@/components/card";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { Input } from "@/components/input";
import { Spinner } from "@/components/spinner";
import { copyToClipboard } from "@/lib/clipboard";
import { META_TOKEN_MAX, META_TOKEN_MIN, normalizeMetaToken } from "@/lib/meta-token";
import { revealModelToken } from "@/lib/model-token.server";
import { currentAccessToken } from "@/lib/use-auth";

type MetaTokenFieldProps = {
  id: string;
  label?: string;
  /** Só para deixar claro de onde o token sai. */
  hint?: string;
  /** Há token salvo no servidor. */
  hasToken: boolean;
  /** Modelo dona do token. Sem isso não há o que revelar. */
  modelId?: string | null;
  /** `token` vazio é o comando de remover. */
  onSave: (token: string) => Promise<boolean>;
};

/**
 * Máscara de tamanho fixo: mostrar prefixo ou o comprimento do token já contaria
 * como delivering parte da credencial para quem estiver olhando a tela.
 */
const MASK = "•".repeat(24);

/**
 * Campo do token da Meta.
 *
 * O token é gravado cifrado, mas pode ser lido de volta pelo botão de olho: o
 * dono costuma precisar conferir a credencial em outro lugar, e nenhuma das
 * duas metades sozinha ajuda. Por isso o botão é explícito, o texto some
 * quando o campo perde o foco e o valor nunca entra em nenhum payload de lista.
 */
export function MetaTokenField({
  id,
  label = "Token da API de Conversões",
  hint,
  hasToken,
  modelId,
  onSave,
}: MetaTokenFieldProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  // Espelha a prop para o botão de remover existir: quem vem do banco é a
  // verdade, mas só chega aqui depois do reload, então o save também atualiza.
  const [configured, setConfigured] = useState(hasToken);
  useEffect(() => {
    setConfigured(hasToken);
  }, [hasToken]);

  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trocar de modelo tem que descartar o token revelado, senão o texto da
  // credencial antiga ficaria na tela de outra modelo.
  useEffect(() => {
    setRevealed(null);
    setEditing(false);
  }, [modelId]);

  const showSaved = configured && !editing;
  const dirty = value.trim() !== "";

  async function save() {
    if (saving) return;

    let normalized: string | null;
    try {
      normalized = normalizeMetaToken(value);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Token inválido.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    // Sem `modelId` o token não vai para o banco agora: numa modelo nova ele
    // fica guardado em memória pelo `model-form` e sobe junto com o cadastro.
    // Dizer "salvo" aqui seria mentira — e ainda deixaria o campo travado na
    // visão mascarada, com um botão de olho que não tem nada para mostrar.
    const deferred = !modelId;

    try {
      await onSave(normalized ?? "");
      // Sobra nada na memória do navegador depois de salvar.
      setValue("");
      setRevealed(null);
      setFeedback(
        deferred
          ? {
              kind: "success",
              text:
                normalized === null
                  ? "Token removido."
                  : "Token guardado. Ele entra no banco assim que a modelo for criada.",
            }
          : {
              kind: "success",
              text: normalized === null ? "Token removido." : "Token salvo.",
            },
      );
      // Na criação o campo continua editável: ainda não existe nada para
      // consultar, então a visão mascarada seria um beco sem saída.
      if (!deferred) {
        setConfigured(normalized !== null);
        setEditing(false);
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar o token.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    if (!modelId || revealing) return;

    setRevealing(true);
    setFeedback(null);

    try {
      const { token } = await revealModelToken({
        data: { modelId, accessToken: await currentAccessToken() },
      });

      if (!token) {
        setFeedback({ kind: "error", text: "Esta modelo ainda não tem token salvo." });
        return;
      }
      setRevealed(token);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível ler o token.",
      });
    } finally {
      setRevealing(false);
    }
  }

  async function onCopy() {
    if (!revealed) return;

    const ok = await copyToClipboard(revealed);
    if (!ok) return;

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {showSaved ? (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              id={id}
              readOnly
              value={revealed ?? MASK}
              spellCheck={false}
              onFocus={() => setRevealed(null)}
              className={
                revealed
                  ? "pr-11 font-mono text-xs"
                  : "pr-11 text-center font-mono tracking-[0.35em] text-muted-foreground"
              }
            />

            <button
              type="button"
              onClick={() => void toggleReveal()}
              disabled={revealing}
              aria-label={revealed ? "Esconder token" : "Mostrar token"}
              aria-pressed={revealed !== null}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-input text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
            >
              {revealing ? (
                <Spinner className="size-4" />
              ) : revealed !== null ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          {revealed !== null && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => void onCopy()}
              aria-label="Copiar token"
              className="shrink-0"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
        </div>
      ) : (
        <Input
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
          minLength={META_TOKEN_MIN}
          maxLength={META_TOKEN_MAX}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Cole o token aqui"
        />
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <p className="text-xs text-muted-foreground/80">
        Guardado cifrado no banco. O botão de olho traz o token para esta tela, então evite deixar a
        página aberta em local público.
      </p>

      <Feedback feedback={feedback} />

      <div className="flex flex-wrap gap-2">
        {showSaved ? (
          <>
            <Button variant="secondary" size="sm" type="button" onClick={() => setEditing(true)}>
              Trocar token
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Spinner /> : <Trash2 />}
              Remover
            </Button>
          </>
        ) : (
          <>
            {dirty && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? <Spinner /> : <Save />}
                {configured ? "Trocar token" : "Salvar token"}
              </Button>
            )}

            {configured && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setValue("");
                }}
              >
                Cancelar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
