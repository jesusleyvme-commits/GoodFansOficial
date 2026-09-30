import { Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import { Label } from "@/components/card";
import type { DeliveryLink } from "@/lib/database.types";
import { euroToInput, parseEuro } from "@/lib/links";
import { updateLink } from "@/lib/links-api";

type LinkEditorProps = {
  link: DeliveryLink;
  onSaved: (link: DeliveryLink) => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Edição inline de um link já gerado. Trocar nome ou destino não muda o id, então
 * o link já compartilhado continua valendo e não precisa ser reenviado a ninguém.
 */
export function LinkEditor({ link, onSaved, onCancel }: LinkEditorProps) {
  const [productName, setProductName] = useState(link.product_name);
  const [destinationUrl, setDestinationUrl] = useState(link.destination_url);
  const [valueEur, setValueEur] = useState(euroToInput(link.value_eur));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      const saved = await updateLink(link.id, {
        productName,
        destinationUrl,
        valueEur: parseEuro(valueEur),
      });
      setFeedback({ kind: "success", text: "Link atualizado." });
      await onSaved(saved);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar o link.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
      <div className="space-y-2">
        <Label htmlFor={`product-${link.id}`}>Nome do produto</Label>
        <Input
          id={`product-${link.id}`}
          maxLength={120}
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Masterclass Exclusiva"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`destination-${link.id}`}>URL de destino</Label>
        <Input
          id={`destination-${link.id}`}
          type="url"
          value={destinationUrl}
          onChange={(event) => setDestinationUrl(event.target.value)}
          placeholder="https://t.me/anasouza"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`value-${link.id}`}>Valor em euros</Label>
        <Input
          id={`value-${link.id}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valueEur}
          onChange={(event) => setValueEur(event.target.value)}
          placeholder="19,90"
        />
        <p className="text-xs text-muted-foreground">
          Ajuste a receita já convertida. Apagar o campo deixa o evento sem valor.
        </p>
      </div>

      <Feedback feedback={feedback} />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          <X />
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Botão de editar que abre o `LinkEditor` da linha correspondente. */
export function EditLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} aria-label="Editar link" type="button">
      <Pencil />
      Editar
    </Button>
  );
}
