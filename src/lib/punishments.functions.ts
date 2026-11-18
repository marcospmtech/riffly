// Server functions de punições (owner only): listar ativas, editar duração, remover.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logAudit, resolveActor } from "@/lib/audit.functions";

async function requireOwner(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["owner"]);
  if (error) throw error;
  if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });
}

export interface PunishmentRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  reason: string;
  proof_path: string | null;
  expires_at: string | null;
  created_at: string;
}

// Só o dono acessa (motivo/prova de punição não são para admins comuns).
export const listActivePunishments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PunishmentRow[]> => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("punishments")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const userIds = [...new Set(rows.flatMap((r) => [r.user_id, r.admin_id].filter(Boolean) as string[]))];
    const actors = await Promise.all(userIds.map((id) => resolveActor(supabaseAdmin, id)));
    const actorById = new Map(userIds.map((id, i) => [id, actors[i]]));

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: actorById.get(r.user_id)?.name ?? null,
      user_email: actorById.get(r.user_id)?.email ?? null,
      admin_id: r.admin_id,
      admin_name: r.admin_id ? (actorById.get(r.admin_id)?.name ?? null) : null,
      admin_email: r.admin_id ? (actorById.get(r.admin_id)?.email ?? null) : null,
      reason: r.reason,
      proof_path: r.proof_path,
      expires_at: r.expires_at,
      created_at: r.created_at,
    }));
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  // Valor absoluto de minutos (não delta) — o front calcula a partir do tempo restante atual.
  duration: z.union([z.literal("infinity"), z.number().int().min(1)]),
});

export const updatePunishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: punishment, error: readError } = await supabaseAdmin
      .from("punishments")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw readError;
    if (!punishment) throw new Response("Punição não encontrada", { status: 404 });

    const expiresAt =
      data.duration === "infinity" ? null : new Date(Date.now() + data.duration * 60_000).toISOString();

    const { error } = await supabaseAdmin.from("punishments").update({ expires_at: expiresAt }).eq("id", data.id);
    if (error) throw error;

    const actor = await resolveActor(supabaseAdmin, context.userId);
    const target = await resolveActor(supabaseAdmin, punishment.user_id);
    await logAudit(supabaseAdmin, {
      action: "punishment_updated",
      actorId: context.userId,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: target.name ?? target.email,
      targetDetail: data.duration === "infinity" ? "Definido como permanente" : `Novo tempo: ${data.duration} min`,
    });

    return { ok: true };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const deletePunishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: deleted, error } = await supabaseAdmin
      .from("punishments")
      .delete()
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!deleted) throw new Response("Punição não encontrada", { status: 404 });

    const actor = await resolveActor(supabaseAdmin, context.userId);
    const target = await resolveActor(supabaseAdmin, deleted.user_id);
    await logAudit(supabaseAdmin, {
      action: "punishment_removed",
      actorId: context.userId,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: target.name ?? target.email,
    });

    return { ok: true };
  });
