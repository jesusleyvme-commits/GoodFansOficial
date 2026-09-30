import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { Feedback } from "@/components/feedback";
import { Spinner } from "@/components/spinner";
import { type FinanceSummary, formatDate, formatEur, loadFinanceSummary } from "@/lib/finance-api";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/financeiro")({
  component: FinanceiroPage,
  head: () => pageHead({ title: "Dashboard financeiro", path: "/dashboard/financeiro" }),
});

function FinanceiroPage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErro(null);
    try {
      setData(await loadFinanceSummary());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar os números.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quanto cada link rendeu, pelo valor que você configurou nele.
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
            Nenhum link seu ainda. Os números aparecem aqui assim que você criar o primeiro.
          </p>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Conversões"
              value={String(data.totals.conversions)}
              hint="Cliques registrados nos seus links"
            />
            <Metric
              label="Receita estimada"
              value={formatEur(data.totals.estimatedEur)}
              hint={`${data.totals.linksWithValue} link(s) com valor configurado`}
            />
            <Metric
              label="Coletas"
              value={String(data.totals.leads)}
              hint="Formulários aceitos no gate"
            />
            <Metric
              label="Enviadas à Meta"
              value={String(data.totals.sentToMeta)}
              hint={
                data.totals.sentToMeta < data.totals.conversions
                  ? `${data.totals.conversions - data.totals.sentToMeta} não chegaram à Meta`
                  : "Todas as conversões chegaram à Meta"
              }
            />
          </dl>

          {/* A ressalva mora na página, e não no rodapé miúdo: este número é
              uma multiplicação de um valor digitado por uma contagem de
              cliques. Quem lê como faturamento fechado toma decisão errada. */}
          <div className="flex gap-3 rounded-input border border-amber-500/20 bg-amber-500/[0.05] p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100/85">
              A receita aqui é <strong>conversões × o valor configurado no link</strong>, não o que
              foi cobrado. Uma compra pode custar menos que esse valor, e a Meta é quem fecha o
              faturamento. Trate este número como estimativa para decidir o que impulsionar.
            </p>
          </div>

          <div className="overflow-x-auto rounded-card border border-white/[0.06] bg-white/[0.02]">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Link
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Valor
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Conversões
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Coletas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Receita est.
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Última
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.linkId} className="border-b border-white/[0.04] last:border-0">
                    <td className="max-w-[16rem] truncate px-4 py-3" title={row.productName}>
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.valueEur === null ? "—" : formatEur(row.valueEur)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.conversions}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.leads}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.valueEur === null ? "—" : formatEur(row.valueEur * row.conversions)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.lastConversionAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
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
