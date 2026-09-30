import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { Feedback } from "@/components/feedback";
import { Spinner } from "@/components/spinner";
import { type FinanceSummary, formatDate, loadFinanceSummary } from "@/lib/finance-api";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
  head: () => pageHead({ title: "Dashboard", path: "/dashboard" }),
});

/**
 * Visão geral: quanto entrou, quanto se coletou e o que está se movendo.
 *
 * O dinheiro fica na aba Financeiro. Aqui é volume, e a receita estimada aparece
 * só como uma linha do total, porque é a mesma conta de lá e repetir o número em
 * dois lugares é como os dois passam a divergir.
 */
function DashboardPage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErro(null);
    try {
      setData(await loadFinanceSummary());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar o resumo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O resumo dos seus links e de quem já passou por eles.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
          Atualizar
        </Button>
      </div>

      {erro && <Feedback feedback={{ kind: "error", text: erro }} />}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-5 text-brand-400" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-input border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum link seu ainda. Crie um modelo e gere o primeiro link para o painel começar a
            contar.
          </p>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Links"
              value={String(data.rows.length)}
              hint="Links que você compartilha"
            />
            <Metric
              label="Conversões"
              value={String(data.totals.conversions)}
              hint="Cliques registrados nos seus links"
            />
            <Metric
              label="Coletas"
              value={String(data.totals.leads)}
              hint="Formulários aceitos no gate"
            />
            <Metric
              label="Taxa de coleta"
              value={`${taxaColeta(data)}%`}
              hint="Coletas por conversão, no período"
            />
          </dl>

          <div className="rounded-card border border-white/[0.06] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h2 className="text-sm font-medium">Links em movimento</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Do que mais converte para o que menos converte.
              </p>
            </div>

            <ul className="divide-y divide-white/[0.04]">
              {data.rows.map((row) => (
                <li
                  key={row.linkId}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm" title={row.productName}>
                    {row.productName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.conversions === 1 ? "1 conversão" : `${row.conversions} conversões`}
                  </span>
                  {row.leads > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {row.leads === 1 ? "1 coleta" : `${row.leads} coletas`}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/80">
                    {formatDate(row.lastConversionAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/** Cento por cento não é um teto real: um link sem gate não gera coleta nenhuma. */
function taxaColeta(data: FinanceSummary): string {
  if (data.totals.conversions === 0) return "0";
  return Math.round((data.totals.leads / data.totals.conversions) * 100).toString();
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-white/[0.06] bg-white/[0.02] p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>
    </div>
  );
}
