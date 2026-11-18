// Painel do dono: aba Contas (gerenciar usuários/admins) e aba Punições (punições ativas).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Key, Trash2, X, Shield, Crown, Search, Info } from "lucide-react";
import { listUsers, createAdmin, resetUserPassword, deleteUser, updateUserRole, type AdminUser, type AccountRole } from "@/lib/admin.functions";
import {
  listActivePunishments,
  updatePunishment,
  deletePunishment,
  type PunishmentRow,
} from "@/lib/punishments.functions";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/dono")({
  head: () => ({
    meta: [
      { title: "Painel do dono — Riffly" },
      { name: "description", content: "Gerencie usuários e administradores do Riffly." },
      { property: "og:title", content: "Painel do dono — Riffly" },
      { property: "og:description", content: "Gerencie usuários e administradores do Riffly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DonoPage,
});

function DonoPage() {
  const role = useRole();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [resetPwd, setResetPwd] = useState<{ email: string; password: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: role === "owner",
  });

  const q = search.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter((u) => (u.display_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users;

  const resetMut = useMutation({
    mutationFn: (u: AdminUser) => resetUserPassword({ data: { user_id: u.id } }),
    onSuccess: (data: any, u) => {
      setResetPwd({ email: u.email, password: data.password });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser({ data: { user_id: id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role: nextRole }: { id: string; role: AccountRole }) =>
      updateUserRole({ data: { user_id: id, role: nextRole } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Cargo atualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar cargo"),
  });

  if (role && role !== "owner") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">Apenas o dono do servidor pode acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Tabs defaultValue="contas">
        <TabsList className="mb-6">
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="punicoes">Punições</TabsTrigger>
        </TabsList>

        <TabsContent value="contas">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel do dono</h1>
              <p className="mt-1 text-sm text-muted-foreground">Gerencie contas de usuários e administradores.</p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <UserPlus className="h-4 w-4" /> Criar administrador
            </Button>
          </div>

          {isLoading && <p className="text-muted-foreground">Carregando...</p>}
          {error && <p className="text-destructive">Erro ao carregar usuários.</p>}

          {!isLoading && (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-muted-foreground">
                  <tr>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Papel</th>
                    <th className="p-3">Criada em</th>
                    <th className="p-3">
                      <div className="relative ml-auto w-full max-w-[220px]">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar usuário..."
                          aria-label="Buscar usuário"
                          className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs font-normal normal-case text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{u.display_name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="p-3">
                        {u.id === currentUser?.id ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <Select
                            value={u.role}
                            disabled={roleMut.isPending}
                            onValueChange={(nextRole) => roleMut.mutate({ id: u.id, role: nextRole as AccountRole })}
                          >
                            <SelectTrigger className="w-36" aria-label={`Cargo de ${u.email}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Dono</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">Usuário</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(u.created_at))}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => resetMut.mutate(u)}
                            title="Redefinir senha"
                            aria-label={`Redefinir senha de ${u.email}`}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          {u.role !== "owner" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Excluir ${u.email}?`)) deleteMut.mutate(u.id);
                              }}
                              className="text-destructive hover:text-destructive"
                              title="Excluir"
                              aria-label={`Excluir ${u.email}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        {users.length === 0 ? "Nenhum usuário cadastrado." : "Nenhum usuário encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {showCreate && (
            <CreateAdminDialog
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                void qc.invalidateQueries({ queryKey: ["admin-users"] });
                setShowCreate(false);
              }}
            />
          )}

          {resetPwd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Nova senha gerada</h2>
                <p className="mt-2 text-sm text-muted-foreground">Copie e envie para {resetPwd.email}:</p>
                <div className="mt-3 rounded-lg bg-background p-3 font-mono text-sm text-foreground">
                  {resetPwd.password}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setResetPwd(null)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="punicoes">
          <PunishmentsTab enabled={role === "owner"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  const cfg = {
    owner: { label: "Dono", cls: "bg-riffly-purple/20 text-riffly-purple", Icon: Crown },
    admin: { label: "Admin", cls: "bg-primary/20 text-primary", Icon: Shield },
    user: { label: "Usuário", cls: "bg-muted text-muted-foreground", Icon: null as any },
  }[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.Icon && <cfg.Icon className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function CreateAdminDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const mut = useMutation({
    mutationFn: () => createAdmin({ data: { email, password, display_name: displayName } }),
    onSuccess: () => {
      toast.success("Administrador criado");
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Criar administrador</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Senha (min 8)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !email || password.length < 8 || !displayName}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {mut.isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PunishmentsTab({ enabled }: { enabled: boolean }) {
  const [detail, setDetail] = useState<PunishmentRow | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["active-punishments"],
    queryFn: () => listActivePunishments(),
    enabled,
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Punições ativas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Usuários impedidos de comentar no momento.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">Erro ao carregar punições.</p>}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin que executou</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Alvo</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.admin_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.admin_email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-foreground">Puniu usuário</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.user_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.user_email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {p.expires_at ? new Date(p.expires_at).toLocaleString("pt-BR") : "Infinity (permanente)"}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDetail(p)} aria-label="Ver detalhes">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhuma punição ativa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {detail && <PunishmentDetailDialog punishment={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function remainingMinutes(expiresAt: string | null): number {
  if (!expiresAt) return 60;
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));
}

function PunishmentDetailDialog({ punishment, onClose }: { punishment: PunishmentRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [permanent, setPermanent] = useState(punishment.expires_at === null);
  const [minutes, setMinutes] = useState(String(remainingMinutes(punishment.expires_at)));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePunishment({
        data: { id: punishment.id, duration: permanent ? "infinity" : Math.max(1, parseInt(minutes, 10) || 1) },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["active-punishments"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePunishment({ data: { id: punishment.id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["active-punishments"] });
      onClose();
    },
  });

  const proofUrl = punishment.proof_path ? `/api/proof?path=${encodeURIComponent(punishment.proof_path)}` : null;

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Remover punição"
        description={`Isso libera ${punishment.user_name ?? "este usuário"} para comentar novamente. Deseja continuar?`}
        confirmLabel="Remover punição"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Detalhes da punição</h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Usuário punido</p>
            <p className="text-foreground">{punishment.user_name ?? "—"}</p>
            <p className="text-muted-foreground">{punishment.user_email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Aplicado por</p>
            <p className="text-foreground">{punishment.admin_name ?? "—"}</p>
            <p className="text-muted-foreground">{punishment.admin_email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Motivo</p>
            <p className="whitespace-pre-wrap text-foreground">{punishment.reason}</p>
          </div>
          {proofUrl && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Print (prova)</p>
              <img src={proofUrl} alt="Prova do comentário" className="mt-1 max-h-64 rounded-lg border border-border" />
            </div>
          )}

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Tempo banido</p>
            <label className="flex items-center gap-2 text-foreground">
              <input
                type="checkbox"
                checked={permanent}
                onChange={(e) => setPermanent(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
              Infinity (permanente)
            </label>
            {!permanent && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-9 w-32 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-xs text-muted-foreground">
                  minutos (mín. 1) — edite para adicionar ou remover tempo
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button type="button" variant="destructive" onClick={() => setConfirmingDelete(true)}>
            Remover punição
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || (!permanent && !minutes)}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
