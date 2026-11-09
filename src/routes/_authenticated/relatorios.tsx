import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getMonthlyReport, saveReportSnapshot } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-role";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Riffly" },
      { name: "description", content: "Relatório mensal de músicas adicionadas e favoritadas." },
      { property: "og:title", content: "Relatórios — Riffly" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelatoriosPage,
});

const chartConfig: ChartConfig = {
  adicionadas: { label: "Músicas adicionadas", color: "var(--color-riffly-purple)" },
  favoritadas: { label: "Músicas favoritadas", color: "var(--color-riffly-yellow)" },
};

// Fixo 2026–2030, conforme pedido. Anos sem nenhum registro em songs/favorites
// simplesmente retornam rows com zero em todos os meses — o BarChart renderiza
// normalmente, só sem altura nas barras.
const REPORT_YEARS = [2026, 2027, 2028, 2029, 2030];

function RelatoriosPage() {
  const role = useRole();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(REPORT_YEARS[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["monthly-report", year],
    queryFn: () => getMonthlyReport({ data: { year } }),
    enabled: role === "owner",
  });

  const saveMutation = useMutation({
    mutationFn: () => saveReportSnapshot({ data: { year } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["monthly-report", year], result);
    },
  });

  if (role && role !== "owner") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">Apenas o dono do servidor pode acessar esta página.</p>
      </div>
    );
  }

  const totals = data?.rows.reduce(
    (acc, r) => ({
      adicionadas: acc.adicionadas + r.adicionadas,
      favoritadas: acc.favoritadas + r.favoritadas,
    }),
    { adicionadas: 0, favoritadas: 0 },
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          #report-print-area .no-print { display: none !important; }
        }
      `}</style>

      <aside className="no-print w-32 shrink-0">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ano
        </h2>
        <nav className="flex flex-col gap-1">
          {REPORT_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                y === year
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {y}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div id="report-print-area">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Relatório {year}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Músicas adicionadas e favoritadas por mês.
              </p>
              {data && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.isSnapshot
                    ? `Salvo em ${new Date(data.savedAt!).toLocaleString("pt-BR")}`
                    : "Ainda não salvo — mostrando dados ao vivo"}
                </p>
              )}
            </div>
            <div className="no-print flex gap-2">
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar relatório"}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Imprimir
              </Button>
            </div>
          </div>

          {isLoading && <p className="text-muted-foreground">Carregando...</p>}
          {error && <p className="text-destructive">Erro ao carregar relatório.</p>}
          {saveMutation.isError && (
            <p className="text-destructive">Erro ao salvar relatório.</p>
          )}

          {totals && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Total adicionadas ({year})</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{totals.adicionadas}</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Total favoritadas ({year})</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{totals.favoritadas}</div>
              </div>
            </div>
          )}

          {data && (
            <div className="rounded-lg border border-border bg-card p-4">
              <ChartContainer config={chartConfig} className="aspect-auto h-[400px] w-full">
                <BarChart data={data.rows} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="adicionadas" fill="var(--color-adicionadas)" radius={4} />
                  <Bar dataKey="favoritadas" fill="var(--color-favoritadas)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
