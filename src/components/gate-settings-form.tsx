import { Eye, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Card, CardDescription, CardHeader, CardTitle, Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import type { DeliveryLink } from "@/lib/database.types";
import { updateLinkGate } from "@/lib/links-api";

type GateSettingsFormProps = {
  link: DeliveryLink;
  onSaved: (link: DeliveryLink) => void | Promise<void>;
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
 * Construtor do gate, sem código.
 *
 * Separado do `LinkEditor` de propósito. A troca de nome, destino e valor é o
 * ajuste do link; isto é o ajuste da página que o visitante vê, e as duas
 * coisas continuam funcionando uma com a outra desligadas. Quem monta a página
 * não deveria precisar salvar o link inteiro para poder mudar um título.
 */
export function GateSettingsForm({ link, onSaved }: GateSettingsFormProps) {
  const [showLogo, setShowLogo] = useState(link.show_logo);
  const [collectName, setCollectName] = useState(link.collect_name);
  const [collectEmail, setCollectEmail] = useState(link.collect_email);
  const [collectPhone, setCollectPhone] = useState(link.collect_phone);
  const [headline, setHeadline] = useState(link.gate_headline ?? "");
  const [subhead, setSubhead] = useState(link.gate_subhead ?? "");
  const [privacyNote, setPrivacyNote] = useState(link.privacy_note ?? "");
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
      const saved = await updateLinkGate(link.id, {
        showLogo,
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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Página de entrega</CardTitle>
        <CardDescription>
          O que o visitante vê antes de ser levado ao destino. Com os campos desligados, a página
          volta a ser só um botão.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Identidade</Label>
          <Checkbox
            id={`logo-${link.id}`}
            checked={showLogo}
            onChange={setShowLogo}
            title="Mostrar a marca da GoodFans"
            description="A marca aparece no topo, acima do nome do produto."
          />
        </div>

        <div className="space-y-3">
          <Label>Dados que você quer receber</Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Todo campo ligado aparece no formulário e passa a ser obrigatório. Desligado, ele some da
            tela e o banco nem recebe o dado.
          </p>

          <div className="space-y-2">
            <Checkbox
              id={`name-${link.id}`}
              checked={collectName}
              onChange={setCollectName}
              title="Nome completo"
              description="Como a pessoa se identifica."
            />
            <Checkbox
              id={`email-${link.id}`}
              checked={collectEmail}
              onChange={setCollectEmail}
              title="E-mail"
              description="Também é o que permite falar com essa pessoa depois."
            />
            <Checkbox
              id={`phone-${link.id}`}
              checked={collectPhone}
              onChange={setCollectPhone}
              title="Telefone"
              description="Útil para quem vende pelo WhatsApp."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`headline-${link.id}`}>Título</Label>
          <Input
            id={`headline-${link.id}`}
            maxLength={120}
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Seu acesso está liberado"
          />
          <p className="text-xs text-muted-foreground">
            Vazio usa o texto padrão do app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`subhead-${link.id}`}>Subtítulo</Label>
          <Input
            id={`subhead-${link.id}`}
            maxLength={160}
            value={subhead}
            onChange={(event) => setSubhead(event.target.value)}
            placeholder="Preencha abaixo para entrar."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`privacy-${link.id}`}>Aviso de privacidade</Label>
          <Textarea
            id={`privacy-${link.id}`}
            rows={5}
            maxLength={1200}
            value={privacyNote}
            onChange={(event) => setPrivacyNote(event.target.value)}
            placeholder="Usamos seus dados apenas para liberar o acesso…"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Say what you collect, why, and how to ask for deletion. Vazio usa o texto padrão do app.
            Escrever promessa de conformidade que o produto não cumpre é problema do produto, não
            do texto.
          </p>
        </div>

        {!algumCampo && (
          <div className="rounded-input border border-amber-500/20 bg-amber-500/[0.05] p-3 text-xs leading-relaxed text-amber-100/85">
            Sem nenhum campo ligado, não há formulário. A página será só o botão de entrar, e
            nenhuma coleta é gravada.
          </div>
        )}

        <Feedback feedback={feedback} />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="submit" disabled={saving}>
            <Save />
            {saving ? "Salvando…" : "Salvar página"}
          </Button>

          <Button size="sm" variant="secondary" asChild>
            <a href={`/dashboard/preview/${link.id}`} target="_blank" rel="noreferrer">
              <Eye />
              Ver como o cliente vê
            </a>
          </Button>
        </div>
      </form>
    </Card>
  );
}
