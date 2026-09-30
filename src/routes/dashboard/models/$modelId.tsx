import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Eye, Link2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { DeleteByName } from "@/components/delete-by-name";
import { Card, CardDescription, CardHeader, CardTitle, Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import { EditLinkButton, LinkEditor } from "@/components/link-editor";
import { MetaTestButton } from "@/components/meta-test-button";
import { ModelAvatar } from "@/components/model-avatar";
import { Spinner } from "@/components/spinner";
import { copyToClipboard } from "@/lib/clipboard";
import type { DeliveryLink, Model } from "@/lib/database.types";
import { createLink, deleteLink, listLinksByModel } from "@/lib/links-api";
import { formatEuro, parseEuro } from "@/lib/links";
import { getModel } from "@/lib/models-api";
import { buildShareUrl } from "@/lib/share-url";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/models/$modelId")({
  component: ModelPage,
  // O nome do produto só existe depois do carregamento, então o título fica
  // genérico e a aba não fica pulando enquanto os dados chegam.
  head: ({ params }) => pageHead({ title: "Links", path: `/dashboard/models/${params.modelId}` }),
});

function ModelPage() {
  const { modelId } = Route.useParams();

  const [model, setModel] = useState<Model | null>(null);
  const [links, setLinks] = useState<DeliveryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [productName, setProductName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [valueEur, setValueEur] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Reabrir o carregamento é o que evita a troca de modelo mostrar dados
    // cruzados: o roteador reaproveita o componente quando só muda o `modelId`,
    // e sem isto o `loading` já vinha `false` da modelo anterior. A tela ficava
    // com o nome, a foto e o pixel da modelo B em cima dos links — e dos
    // endereços copiáveis — da modelo A.
    setLoading(true);
    setLoadError(null);

    try {
      const [current, modelLinks] = await Promise.all([
        getModel(modelId),
        listLinksByModel(modelId),
      ]);

      if (!current) {
        setModel(null);
        setLinks([]);
        setLoadError("Essa modelo não existe ou não é sua.");
        return;
      }

      setModel(current);
      setLinks(modelLinks);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Não foi possível carregar esta modelo.",
      );
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormFeedback(null);

    try {
      await createLink({
        modelId,
        productName,
        destinationUrl,
        valueEur: parseEuro(valueEur),
      });
      setProductName("");
      setDestinationUrl("");
      setValueEur("");
      setFormFeedback({ kind: "success", text: "Link criado. Copie e comece a compartilhar." });
      await refresh();
    } catch (error) {
      setFormFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível criar o link.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onCopy(link: DeliveryLink) {
    const ok = await copyToClipboard(buildShareUrl(link.id));
    if (!ok) return;

    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  async function onDelete(link: DeliveryLink) {
    // A linha só sai da lista depois que o banco confirma. Remover antes deixaria
    // a tela mostrando um sucesso que pode virar erro logo em seguida, e com a
    // linha já fora não haveria o que recarregar.
    try {
      await deleteLink(link.id);
      setLinks((current) => current.filter((item) => item.id !== link.id));
      setDeletingLinkId(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível excluir o link.");
      await refresh();
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner className="size-5 text-brand-400" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/modelos">
            <ArrowLeft />
            Modelos
          </Link>
        </Button>
        <Feedback feedback={{ kind: "error", text: loadError ?? "Modelo não encontrada." }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ModelAvatar model={model} />

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{model.name}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {model.meta_pixel_id ? `Pixel ${model.meta_pixel_id}` : "Sem pixel configurado"}
            </p>
          </div>
        </div>

        {/* Havia dois botões para a mesma rota, a setinha sem texto ao lado do
            avatar e o "Voltar para modelos" à direita. Ficou só o da direita,
            que é o único que diz para onde vai. */}
        <Button variant="secondary" size="sm" asChild>
          <Link to="/dashboard/modelos">
            <ArrowLeft />
            Voltar para modelos
          </Link>
        </Button>
      </div>

      {loadError && <Feedback feedback={{ kind: "error", text: loadError }} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Novo link</CardTitle>
            <CardDescription>
              Cada link valida o visitante, dispara o pixel e depois encaminha ele.
            </CardDescription>
          </CardHeader>

          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Nome do produto</Label>
              <Input
                id="product"
                required
                maxLength={120}
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Masterclass Exclusiva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">URL de destino</Label>
              <Input
                id="destination"
                required
                type="url"
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://t.me/anasouza"
              />
              <p className="text-xs text-muted-foreground">
                Onde o visitante cai depois de validar o acesso.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-value">Valor em euros</Label>
              <Input
                id="link-value"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={valueEur}
                onChange={(event) => setValueEur(event.target.value)}
                placeholder="19,90"
              />
              <p className="text-xs text-muted-foreground">
                Entra como receita no evento de compra. Deixe vazio para não informar.
              </p>
            </div>

            <Feedback feedback={formFeedback} />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Spinner /> : <Plus />}
              Gerar link
            </Button>
          </form>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Links de {model.name}</CardTitle>
            <CardDescription>
              {links.length === 0
                ? "Nenhum link ainda. Gere o primeiro."
                : `${links.length} link${links.length === 1 ? "" : "s"} ativo${links.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </CardHeader>

          {links.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-input border border-dashed border-white/10 py-12 text-center">
              <Link2 className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nada aqui ainda.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {links.map((link) => {
                const shareUrl = buildShareUrl(link.id);
                const copied = copiedId === link.id;

                return (
                  <li
                    key={link.id}
                    className="rounded-input border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{link.product_name}</p>
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                          {shareUrl}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/80">
                          <span>{formatEuro(link.value_eur)}</span>
                          <span>
                            {model.meta_pixel_id
                              ? `Pixel ${model.meta_pixel_id}`
                              : "Modelo sem pixel"}
                          </span>
                        </div>

                        <div className="mt-3">
                          <MetaTestButton linkId={link.id} />
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant={copied ? "secondary" : "primary"}
                          size="sm"
                          onClick={() => void onCopy(link)}
                          aria-label={`Copiar link de ${link.product_name}`}
                        >
                          {copied ? <Check /> : <Copy />}
                          {copied ? "Copiado" : "Copiar link"}
                        </Button>

                        <EditLinkButton onClick={() => setEditingLinkId(link.id)} />

                        <Button variant="secondary" size="sm" asChild>
                          <Link
                            to="/dashboard/preview/$linkId"
                            params={{ linkId: link.id }}
                            aria-label={`Pré-visualizar a página de ${link.product_name}`}
                          >
                            <Eye />
                            Prévia
                          </Link>
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeletingLinkId(link.id)}
                          aria-label={`Excluir link de ${link.product_name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    {deletingLinkId === link.id && (
                      <DeleteByName
                        name={link.product_name}
                        warning={
                          <>
                            Apagar <strong className="font-medium">{link.product_name}</strong>{" "}
                            derruba o link: quem já recebeu deixa de conseguir entrar. Não tem como
                            desfazer.
                          </>
                        }
                        onCancel={() => setDeletingLinkId(null)}
                        onConfirm={() => onDelete(link)}
                      />
                    )}

                    {editingLinkId === link.id && (
                      <LinkEditor
                        link={link}
                        onCancel={() => setEditingLinkId(null)}
                        onSaved={async (saved) => {
                          setLinks((current) =>
                            current.map((item) => (item.id === saved.id ? saved : item)),
                          );
                          setEditingLinkId(null);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
