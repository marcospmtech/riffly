import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Search, Filter } from "lucide-react";
import { getMonthlyReport, saveReportSnapshot } from "@/lib/reports.functions";
import {
  listAuditLogs,
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditLogRow,
} from "@/lib/audit.functions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Riffly" },
      { name: "description", content: "Relatório mensal de músicas adicionadas e favoritadas, e logs de auditoria." },
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

// Rótulos de cargo usados no log de "Cargo modificado", no mesmo padrão de
// textos já usado em /dono (Dono / Admin / Usuário).
const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  user: "Usuário",
};

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
        <Tabs defaultValue="grafico">
          <TabsList className="no-print mb-4">
            <TabsTrigger value="grafico">Gráfico</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="grafico">
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
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab year={year} enabled={role === "owner"} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LogsTab({ year, enabled }: { year: number; enabled: boolean }) {
  // `search` é o que aparece no input, atualizado a cada tecla.
  // `debouncedSearch` é o que realmente vai para a query — só muda 300ms
  // depois que o usuário parar de digitar. Sem esse intervalo, cada tecla
  // digitada dispararia uma requisição nova ao servidor.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    // Se o usuário digitar de novo antes dos 300ms passarem, o timer
    // anterior é cancelado aqui e um novo começa — é assim que o debounce
    // "espera o usuário parar" em vez de só atrasar cada tecla igualmente.
    return () => clearTimeout(timer);
  }, [search]);

  // Qualquer mudança no que está sendo filtrado deve voltar para a primeira
  // página — não faz sentido continuar na página 3 de um filtro novo que
  // pode ter poucos resultados.
  useEffect(() => {
    setPage(0);
  }, [year, debouncedSearch, selectedActions]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", year, debouncedSearch, selectedActions, page],
    queryFn: () =>
      listAuditLogs({
        data: {
          year,
          search: debouncedSearch || undefined,
          actions: selectedActions.length > 0 ? selectedActions : undefined,
          page,
        },
      }),
    enabled,
  });

  const toggleAction = (action: AuditAction) => {
    setSelectedActions((current) =>
      current.includes(action) ? current.filter((a) => a !== action) : [...current, action],
    );
  };

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs {year}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ações administrativas realizadas na plataforma.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Usuário, alvo, e-mail ou ID..."
              aria-label="Buscar nos logs"
              className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtro
                {selectedActions.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {selectedActions.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Tipo de ação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AUDIT_ACTIONS.map((action) => (
                <DropdownMenuCheckboxItem
                  key={action}
                  checked={selectedActions.includes(action)}
                  onCheckedChange={() => toggleAction(action)}
                  // Impede o menu de fechar a cada clique — sem isso o
                  // usuário teria que reabrir o dropdown para marcar cada
                  // ação, uma por vez.
                  onSelect={(e) => e.preventDefault()}
                >
                  {AUDIT_ACTION_LABELS[action]}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedActions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={() => setSelectedActions([])}
                  >
                    Limpar filtro
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">Erro ao carregar logs.</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
                {data.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum log encontrado para esse filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {total > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} {total === 1 ? "registro" : "registros"} — página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogRow({ log }: { log: AuditLogRow }) {
  const date = new Date(log.created_at);

  // "Cargo modificado" é o único tipo de ação com um detalhe extra (o cargo
  // anterior e o novo), guardado em `metadata` — os outros tipos de ação não
  // usam esse campo.
  const roleChangeDetail =
    log.action === "role_changed" && log.metadata
      ? `${ROLE_LABELS[log.metadata["old_role"] as string] ?? "—"} → ${ROLE_LABELS[log.metadata["new_role"] as string] ?? "—"}`
      : null;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-foreground">{log.actor_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{log.actor_email ?? "—"}</div>
      </TableCell>
      <TableCell>
        <div className="text-foreground">{AUDIT_ACTION_LABELS[log.action]}</div>
        {roleChangeDetail && <div className="text-xs text-muted-foreground">{roleChangeDetail}</div>}
      </TableCell>
      <TableCell>
        <div className="font-medium text-foreground">{log.target_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{log.target_detail ?? "—"}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {date.toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </TableCell>
    </TableRow>
  );
}
