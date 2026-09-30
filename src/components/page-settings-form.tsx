import { Eye, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Card, CardDescription, CardHeader, CardTitle, Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import type { DeliveryLink } from "@/lib/database.types";
import { updatePageSettings, type PageSettings } from "@/lib/page-api";

type PageSettingsFormProps = {
  settings: PageSettings;
  /** Só para escolher qual link abrir no preview. A página em si é uma só. */
  links: DeliveryLink[];
  onSaved: (settings: PageSettings) => void | Promise<void>;
};

function Checkbox({
  id,
  checked,
  onChange,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-input border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea"> & { className?: string }) {
  return (
    <textarea
      className={
        "w-full rounded-input border border-border bg-input px-4 py-3 text-sm text-foreground " +
        "transition-colors duration-200 placeholder:text-muted-foreground/70 " +
        "hover:border-white/15 focus:border-brand-500 focus:outline-none " +
        className
      }
      {...props}
    />
  );
}

/**
 * Construtor da página de entrega, sem código.
 *
 * Uma página só para a conta inteira, e não uma por link. O nome do produto, o
 * destino e a foto vêm do link; tudo que é texto ou campo pertence ao creator.
 * Criar um link novo não obriga a remontar a tela, e nenhum link fica com uma
 * página diferente do outro sem ninguém perceber.
 */
export function PageSettingsForm({ settings, links, onSaved }: PageSettingsFormProps) {
  const [collectName, setCollectName] = useState(settings.collectName);
  const [collectEmail, setCollectEmail] = useState(settings.collectEmail);
  const [collectPhone, setCollectPhone] = useState(settings.collectPhone);
  const [headline, setHeadline] = useState(settings.headline ?? "");
  const [subhead, setSubhead] = useState(settings.subhead ?? "");
  const [privacyNote, setPrivacyNote] = useState(settings.privacyNote ?? "");
  const [previewLinkId, setPreviewLinkId] = useState(links[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  const algumCampo = collectName || collectEmail || collectPhone;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      const saved = await updatePageSettings({
        collectName,
        collectEmail,
        collectPhone,
        headline,
        subhead,
        privacyNote,
      });
      setFeedback({ kind: "success", text: "Página atualizada." });
      await onSaved(saved);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar a página.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Página de entrega</CardTitle>
        <CardDescription>
          Uma página só para todos os seus links. O nome do produto e a foto da modelo vêm do link;
          o que você escrever aqui vale para todos. Com os campos desligados, a página volta a ser
          só um botão.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label>Dados que você quer receber</Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Todo campo ligado aparece no formulário e passa a ser obrigatório. Desligado, ele some
            da tela e o banco nem recebe o dado.
          </p>

          <div className="space-y-2">
            <Checkbox
              id="page-name"
              checked={collectName}
              onChange={setCollectName}
              title="Nome completo"
              description="Como a pessoa se identifica."
            />
            <Checkbox
              id="page-email"
              checked={collectEmail}
              onChange={setCollectEmail}
              title="E-mail"
              description="Também é o que permite falar com essa pessoa depois."
            />
            <Checkbox
              id="page-phone"
              checked={collectPhone}
              onChange={setCollectPhone}
              title="Telefone"
              description="Útil para quem vende pelo WhatsApp."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-headline">Título</Label>
          <Input
            id="page-headline"
            maxLength={120}
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Preencha para liberar o acesso"
          />
          <p className="text-xs text-muted-foreground">Vazio usa o texto padrão do app.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-subhead">Subtítulo</Label>
          <Input
            id="page-subhead"
            maxLength={200}
            value={subhead}
            onChange={(event) => setSubhead(event.target.value)}
            placeholder="Pode preencher sem preocupação."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-privacy">Aviso de privacidade</Label>
          <Textarea
            id="page-privacy"
            rows={6}
            maxLength={1200}
            value={privacyNote}
            onChange={(event) => setPrivacyNote(event.target.value)}
            placeholder="Precisemos destes dados só para liberar seu acesso…"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Diga a finalidade e o fato concreto de proteção: que os dados ficam guardados cifrados e
            quem consegue lê-los. Evite "100% sigilo" e "garantido pela lei" — nada disso é
            verificável, e promessa que não se cumpre é problema do produto, não do texto.
          </p>
        </div>

        {!algumCampo && (
          <div className="rounded-input border border-amber-500/20 bg-amber-500/[0.05] p-3 text-xs leading-relaxed text-amber-100/85">
            Sem nenhum campo ligado, não há formulário. A página será só o botão de entrar, e
            nenhuma coleta é gravada.
          </div>
        )}

        <Feedback feedback={feedback} />

        <div className="space-y-2">
          <Label htmlFor="page-preview-link">Pré-visualizar com o link</Label>
          {links.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Crie um link em Modelos para ver a página. O preview usa um link real porque o nome do
              produto, o destino e a foto da modelo saem dele.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="page-preview-link"
                value={previewLinkId}
                onChange={(event) => setPreviewLinkId(event.target.value)}
                className="min-w-56 flex-1 rounded-input border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              >
                {links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.product_name}
                  </option>
                ))}
              </select>

              <Button size="sm" variant="secondary" asChild disabled={!previewLinkId}>
                <a href={`/dashboard/preview/${previewLinkId}`} target="_blank" rel="noreferrer">
                  <Eye />
                  Ver como o cliente vê
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="submit" disabled={saving}>
            <Save />
            {saving ? "Salvando…" : "Salvar página"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
