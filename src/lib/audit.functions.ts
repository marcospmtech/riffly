import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Mesmo guard usado em reports.functions.ts / admin.functions.ts. O projeto
// duplica esse helper em vez de compartilhar (veja o comentário em
// reports.functions.ts) — mantive o padrão aqui de propósito.
async function requireOwner(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["owner"]);
  if (error) throw error;
  if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });
}

export const AUDIT_ACTIONS = [
  "song_created",
  "song_updated",
  "song_deleted",
  "user_deleted",
  "user_password_reset",
  "admin_created",
  "role_changed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Rótulos em pt-BR usados tanto no filtro da tela quanto na coluna "Ação".
// Centralizado aqui para o front e o back nunca ficarem com textos diferentes
// para a mesma ação.
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  song_created: "Música adicionada",
  song_updated: "Música alterada",
  song_deleted: "Música removida",
  user_deleted: "Usuário removido",
  user_password_reset: "Senha alterada",
  admin_created: "Administrador criado",
  role_changed: "Cargo modificado",
};

interface LogAuditParams {
  action: AuditAction;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  targetName?: string | null;
  targetDetail?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Busca nome de exibição + e-mail de um usuário a partir do userId, olhando
// em duas fontes: a tabela `profiles` (display_name) e `auth.users` (e-mail,
// que não existe em `profiles`). Precisa do client admin porque
// `auth.admin.getUserById` exige a service_role key.
export async function resolveActor(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
): Promise<{ name: string | null; email: string | null }> {
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabaseAdmin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ]);

  return {
    name: profile?.display_name ?? null,
    email: authUser?.user?.email ?? null,
  };
}

// Grava uma linha de auditoria. Deliberadamente "best effort": se o insert
// falhar (ex.: bug de schema, tabela fora do ar), a ação principal que
// chamou isso (deletar usuário, trocar senha, etc.) NÃO deve ser desfeita ou
// bloqueada por causa disso — só registramos o erro no servidor. Um log de
// auditoria é observabilidade, não deveria se tornar motivo de a operação em
// si falhar para o usuário final.
export async function logAudit(
  supabaseAdmin: SupabaseClient<Database>,
  params: LogAuditParams,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      action: params.action,
      actor_id: params.actorId,
      actor_name: params.actorName,
      actor_email: params.actorEmail,
      target_name: params.targetName ?? null,
      target_detail: params.targetDetail ?? null,
      metadata: (params.metadata ?? null) as Database["public"]["Tables"]["audit_logs"]["Insert"]["metadata"],
    });
    if (error) throw error;
  } catch (err) {
    console.error("[audit] falha ao gravar log de auditoria", params.action, err);
  }
}

export interface AuditLogRow {
  id: string;
  action: AuditAction;
  actor_name: string | null;
  actor_email: string | null;
  target_name: string | null;
  target_detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const listAuditLogsSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  // Texto livre: casa com nome/e-mail do ator, nome/detalhe do alvo, e (se
  // parecer um UUID) o ID do usuário ator.
  search: z.string().trim().max(200).optional(),
  // Quando vazio ou omitido, não filtra por ação (mostra tudo).
  actions: z.array(z.enum(AUDIT_ACTIONS)).optional(),
  // Paginação simples por página, não por cursor — a tela carrega "página a
  // página" (50 por vez) em vez de trazer o ano inteiro de uma vez.
  page: z.number().int().min(0).default(0),
});

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ListAuditLogsResult {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listAuditLogsSchema.parse(input))
  .handler(async ({ data, context }): Promise<ListAuditLogsResult> => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rangeStart = `${data.year}-01-01T00:00:00.000Z`;
    const rangeEnd = `${data.year + 1}-01-01T00:00:00.000Z`;
    const from = data.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.actions && data.actions.length > 0) {
      query = query.in("action", data.actions);
    }

    const term = data.search?.trim();
    if (term) {
      // ILIKE usa % e _ como curingas — escapamos para que um nome real com
      // esses caracteres não vire um padrão de busca acidental.
      const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
      const orParts = [
        `actor_name.ilike.%${escaped}%`,
        `actor_email.ilike.%${escaped}%`,
        `target_name.ilike.%${escaped}%`,
        `target_detail.ilike.%${escaped}%`,
      ];
      // Só adiciona a comparação por ID se o termo parecer mesmo um UUID —
      // comparar uma coluna uuid com texto arbitrário gera erro no Postgres.
      if (UUID_RE.test(term)) {
        orParts.push(`actor_id.eq.${term}`);
      }
      query = query.or(orParts.join(","));
    }

    const { data: rows, error, count } = await query;
    if (error) throw error;

    return {
      rows: (rows ?? []) as unknown as AuditLogRow[],
      total: count ?? 0,
      page: data.page,
      pageSize: PAGE_SIZE,
    };
  });
