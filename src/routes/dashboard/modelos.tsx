import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { DeleteByName } from "@/components/delete-by-name";
import { Feedback, type Feedback as FeedbackValue } from "@/components/feedback";
import { ModelAvatar } from "@/components/model-avatar";
import { ModelForm } from "@/components/model-form";
import { Spinner } from "@/components/spinner";
import type { Model } from "@/lib/database.types";
import { deleteModel, listModels } from "@/lib/models-api";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/modelos")({
  component: ModelsPage,
  head: () => pageHead({ title: "Modelos", path: "/dashboard/modelos" }),
});

function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  // null = formulário de criação fechado; id = editando aquela modelo.
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setModels(await listModels());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Não foi possível carregar suas modelos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onDelete(model: Model) {
    setModels((current) => current.filter((item) => item.id !== model.id));
    setDeletingId(null);
    setFeedback({ kind: "success", text: `${model.name} foi apagada.` });

    try {
      await deleteModel(model.id);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível apagar a modelo.",
      });
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modelos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada modelo tem nome, foto, pixel e token. Os links de entrega ficam dentro dela.
          </p>
        </div>

        <Button
          onClick={() => {
            setCreating((v) => !v);
            setEditingId(null);
            setDeletingId(null);
          }}
        >
          <Plus />
          {creating ? "Fechar" : "Adicionar modelo"}
        </Button>
      </div>

      {feedback && <Feedback feedback={feedback} />}

      {creating && (
        <Card className="animate-fade-in max-w-xl">
          <CardHeader>
            <CardTitle>Nova modelo</CardTitle>
            <CardDescription>O destino fica em cada link, não na modelo.</CardDescription>
          </CardHeader>

          <ModelForm
            onSaved={async (saved) => {
              setCreating(false);
              setFeedback({ kind: "success", text: `${saved.name} foi criada.` });
              await refresh();
            }}
          />
        </Card>
      )}

      {loadError && <Feedback feedback={{ kind: "error", text: loadError }} />}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-5 text-brand-400" />
        </div>
      ) : models.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-input border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma modelo ainda. Clique em Adicionar modelo para criar a primeira.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {models.map((model) => {
            const editing = editingId === model.id;
            const deleting = deletingId === model.id;

            return (
              <li
                key={model.id}
                className="rounded-input border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <ModelAvatar model={model} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{model.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">
                      {model.meta_pixel_id ? `Pixel ${model.meta_pixel_id}` : "Sem pixel próprio"}
                      {model.has_meta_token ? " · token configurado" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingId(editing ? null : model.id);
                        setCreating(false);
                        setDeletingId(null);
                      }}
                    >
                      <Pencil />
                      {editing ? "Fechar" : "Editar"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDeletingId(deleting ? null : model.id);
                        setEditingId(null);
                        setCreating(false);
                      }}
                      aria-label={`Apagar ${model.name}`}
                    >
                      <Trash2 />
                      Apagar
                    </Button>

                    <Button size="sm" asChild>
                      <Link
                        to="/dashboard/models/$modelId"
                        params={{ modelId: model.id }}
                        aria-label={`Gerar link de ${model.name}`}
                      >
                        Gerar link
                        <ChevronRight />
                      </Link>
                    </Button>
                  </div>
                </div>

                {editing && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <ModelForm
                      model={model}
                      onSaved={async (saved) => {
                        setEditingId(null);
                        setFeedback({ kind: "success", text: `${saved.name} foi atualizada.` });
                        await refresh();
                      }}
                    />
                  </div>
                )}

                {deleting && (
                  <DeleteByName
                    name={model.name}
                    onCancel={() => setDeletingId(null)}
                    onConfirm={() => onDelete(model)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
